import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileUp,
  FileDown,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  X,
  ArrowLeftRight,
  Save,
  XCircle,
  BookOpen,
  MessageSquare,
  ClipboardCheck,
  Info,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import ImportDialog from "../components/ImportDialog";
import ExamFormDialog from "../components/ExamFormDialog";

// Types
type Question = {
  id: string;
  question: string;
  answer: string;
};

type ExamChoice = {
  text: string;
  is_correct: boolean;
};

type ExamPair = {
  left: string;
  right: string;
};

type ExamQuestion =
  | {
    id: string;
    type: "multiple_choice" | "multiple_answer_choise";
    question: string;
    choices: ExamChoice[];
  }
  | {
    id: string;
    type: "true_false";
    question: string;
    answer: boolean;
  }
  | {
    id: string;
    type: "scenario_question";
    question: string;
    options: string[];
    correct_answer: number;
  }
  | {
    id: string;
    type: "calculation";
    question: string;
    expression: string;
    correct_answer: number;
  }
  | {
    id: string;
    type: "matching";
    question: string;
    pairs: ExamPair[];
  }
  | {
    id: string;
    type: "ordering";
    question: string;
    items: string[];
    correct_order: number[];
  };

type QuizData = {
  id: string;
  summary: string;
  questions: Question[];
  exam: ExamQuestion[];
};

// Question type metadata
const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  multiple_choice:        { label: "Trắc nghiệm 1 đáp án",   color: "#4f46e5", bg: "#eef2ff" },
  multiple_answer_choise: { label: "Trắc nghiệm nhiều đáp án", color: "#7c3aed", bg: "#f5f3ff" },
  true_false:             { label: "Đúng / Sai",              color: "#059669", bg: "#ecfdf5" },
  scenario_question:      { label: "Tình huống",              color: "#d97706", bg: "#fffbeb" },
  calculation:            { label: "Tính toán",               color: "#ea580c", bg: "#fff7ed" },
  matching:               { label: "Nối đáp án",              color: "#0891b2", bg: "#ecfeff" },
  ordering:               { label: "Sắp xếp thứ tự",         color: "#db2777", bg: "#fdf2f8" },
};

// Sortable Item Component
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-move">
      {children}
    </div>
  );
}

export default function Home() {
  const [quizData, setQuizData] = useState<QuizData>({
    id: "",
    summary: "",
    questions: [],
    exam: [],
  });

  const [activeTab, setActiveTab] = useState<"info" | "questions" | "exam">("info");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingExam, setEditingExam] = useState<ExamQuestion | null>(null);
  const [showExamForm, setShowExamForm] = useState(false);
  const [examType, setExamType] = useState<ExamQuestion["type"]>("multiple_choice");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleExport = () => {
    const dataStr = JSON.stringify(quizData, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", "quiz.json");
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setImportJsonText(JSON.stringify(json, null, 2));
        } catch {
          toast.error("Lỗi đọc file JSON", { duration: 3000, position: "top-right" });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportFromText = () => {
    try {
      const json = JSON.parse(importJsonText);
      setQuizData(json);
      setShowImportDialog(false);
      setImportJsonText("");
      toast.success("Import thành công!", { duration: 3000, position: "top-right" });
    } catch {
      toast.error("Lỗi: JSON không hợp lệ. Vui lòng kiểm tra lại cú pháp.", { duration: 4000, position: "top-right" });
    }
  };

  const addQuestion = (question: Question) => {
    setQuizData((prev) => {
      const newQuestions = [...prev.questions, question];
      return {
        ...prev,
        questions: newQuestions.map((q, index) => ({ ...q, id: `q${index + 1}` })),
      };
    });
  };

  const updateQuestion = (question: Question) => {
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === question.id ? question : q)),
    }));
  };

  const deleteQuestion = (id: string) => {
    setQuizData((prev) => {
      const filtered = prev.questions.filter((q) => q.id !== id);
      return { ...prev, questions: filtered.map((q, index) => ({ ...q, id: `q${index + 1}` })) };
    });
  };

  const addExam = (exam: ExamQuestion) => {
    setQuizData((prev) => {
      const newExam = [...prev.exam, exam];
      return { ...prev, exam: newExam.map((e, index) => ({ ...e, id: `e${index + 1}` })) };
    });
  };

  const updateExam = (exam: ExamQuestion) => {
    setQuizData((prev) => ({
      ...prev,
      exam: prev.exam.map((e) => (e.id === exam.id ? exam : e)),
    }));
  };

  const deleteExam = (id: string) => {
    setQuizData((prev) => {
      const filtered = prev.exam.filter((e) => e.id !== id);
      return { ...prev, exam: filtered.map((e, index) => ({ ...e, id: `e${index + 1}` })) };
    });
  };

  const reorderExam = (activeId: string, overId: string) => {
    setQuizData((prev) => {
      const oldIndex = prev.exam.findIndex((e) => e.id === activeId);
      const newIndex = prev.exam.findIndex((e) => e.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newExam = arrayMove(prev.exam, oldIndex, newIndex);
      return { ...prev, exam: newExam.map((e, index) => ({ ...e, id: `e${index + 1}` })) };
    });
  };

  const tabs = [
    { id: "info",      label: "Thông tin",              count: null,                    icon: Info },
    { id: "questions", label: "Câu hỏi thảo luận",      count: quizData.questions.length, icon: MessageSquare },
    { id: "exam",      label: "Bài kiểm tra",           count: quizData.exam.length,      icon: ClipboardCheck },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "14px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px -4px rgba(15,23,42,0.12)",
          },
        }}
      />

      {/* Header */}
      <header style={{ background: "#0f172a" }} className="sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", boxShadow: "0 2px 8px rgba(99,102,241,0.4)" }}
            >
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs leading-none mt-0.5 text-gray-400">
                Quản lý câu hỏi và bài kiểm tra
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "#334155";
                (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "#1e293b";
                (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
              }}
            >
              <FileUp className="w-4 h-4" />
              Import JSON
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
            >
              <FileDown className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(15,23,42,0.06), 0 4px 24px -4px rgba(15,23,42,0.08)" }}
        >
          {/* Tab Navigation */}
          <div style={{ borderBottom: "1px solid #e2e8f0" }}>
            <div className="flex px-6 pt-5 gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold transition-all duration-150 relative"
                    style={{
                      color: isActive ? "#4f46e5" : "#64748b",
                      background: isActive ? "#eef2ff" : "transparent",
                      borderBottom: isActive ? "2px solid #4f46e5" : "2px solid transparent",
                      marginBottom: "-1px",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== null && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{
                          background: isActive ? "#4f46e5" : "#e2e8f0",
                          color: isActive ? "#ffffff" : "#64748b",
                          minWidth: "20px",
                          textAlign: "center",
                        }}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "info" && (
              <InfoTab quizData={quizData} setQuizData={setQuizData} />
            )}
            {activeTab === "questions" && (
              <QuestionsTab
                questions={quizData.questions}
                onAdd={addQuestion}
                onUpdate={updateQuestion}
                onDelete={deleteQuestion}
                editingQuestion={editingQuestion}
                setEditingQuestion={setEditingQuestion}
              />
            )}
            {activeTab === "exam" && (
              <ExamTab
                exam={quizData.exam}
                onAdd={addExam}
                onUpdate={updateExam}
                onDelete={deleteExam}
                onReorder={reorderExam}
                editingExam={editingExam}
                setEditingExam={setEditingExam}
                showExamForm={showExamForm}
                setShowExamForm={setShowExamForm}
                examType={examType}
                setExamType={setExamType}
                sensors={sensors}
              />
            )}
          </div>
        </div>
      </main>

      {showImportDialog && (
        <ImportDialog
          importJsonText={importJsonText}
          setImportJsonText={setImportJsonText}
          onImport={handleImportFromText}
          onCancel={() => { setShowImportDialog(false); setImportJsonText(""); }}
          onFileUpload={handleImport}
        />
      )}
    </div>
  );
}

// ── Info Tab ──────────────────────────────────────────────────────────────────
function InfoTab({
  quizData,
  setQuizData,
}: {
  quizData: QuizData;
  setQuizData: React.Dispatch<React.SetStateAction<QuizData>>;
}) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-semibold mb-1" style={{ color: "#374151" }}>
          ID Bài học
        </label>
        <p className="text-xs mb-2" style={{ color: "#94a3b8" }}>Ví dụ: lessons/PTKT/CH07-LS02.pdf</p>
        <input
          type="text"
          value={quizData.id}
          onChange={(e) => setQuizData((prev) => ({ ...prev, id: e.target.value }))}
          className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150"
          style={{
            border: "1.5px solid #e2e8f0",
            color: "#0f172a",
            outline: "none",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
          onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
          placeholder="lessons/PTKT/CH07-LS02.pdf"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1" style={{ color: "#374151" }}>
          Tóm tắt bài học
        </label>
        <textarea
          value={quizData.summary}
          onChange={(e) => setQuizData((prev) => ({ ...prev, summary: e.target.value }))}
          rows={7}
          className="w-full px-3.5 py-2.5 rounded-lg text-sm resize-none transition-all duration-150"
          style={{
            border: "1.5px solid #e2e8f0",
            color: "#0f172a",
            outline: "none",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
          onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
          placeholder="Nhập tóm tắt bài học..."
        />
      </div>
    </div>
  );
}

// ── Questions Tab ─────────────────────────────────────────────────────────────
function QuestionsTab({
  questions,
  onAdd,
  onUpdate,
  onDelete,
  editingQuestion,
  setEditingQuestion,
}: {
  questions: Question[];
  onAdd: (q: Question) => void;
  onUpdate: (q: Question) => void;
  onDelete: (id: string) => void;
  editingQuestion: Question | null;
  setEditingQuestion: (q: Question | null) => void;
}) {
  const [formData, setFormData] = useState<Question>({ id: "", question: "", answer: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuestion) {
      onUpdate(formData);
      setEditingQuestion(null);
    } else {
      onAdd(formData);
    }
    setFormData({ id: "", question: "", answer: "" });
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData(question);
  };

  const inputStyle = {
    border: "1.5px solid #e2e8f0",
    color: "#0f172a",
    outline: "none",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl p-5 space-y-4"
        style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full" style={{ background: "#4f46e5" }} />
          <h3 className="text-sm font-bold" style={{ color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>
            {editingQuestion ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
          </h3>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>
            Câu hỏi
          </label>
          <input
            type="text"
            value={formData.question}
            onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
            className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
            placeholder="Nhập câu hỏi thảo luận..."
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>
            Đáp án / Gợi ý
          </label>
          <textarea
            value={formData.answer}
            onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg text-sm resize-none transition-all duration-150"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
            placeholder="Nhập đáp án hoặc gợi ý trả lời..."
            required
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150"
            style={{ background: "#4f46e5", boxShadow: "0 1px 4px rgba(79,70,229,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#4338ca")}
            onMouseLeave={e => (e.currentTarget.style.background = "#4f46e5")}
          >
            {editingQuestion ? (
              <><Save className="w-4 h-4" /> Cập nhật</>
            ) : (
              <><Plus className="w-4 h-4" /> Thêm câu hỏi</>
            )}
          </button>
          {editingQuestion && (
            <button
              type="button"
              onClick={() => { setEditingQuestion(null); setFormData({ id: "", question: "", answer: "" }); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{ background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e2e8f0")}
              onMouseLeave={e => (e.currentTarget.style.background = "#f1f5f9")}
            >
              <XCircle className="w-4 h-4" /> Huỷ
            </button>
          )}
        </div>
      </form>

      {/* Question List */}
      {questions.length === 0 ? (
        <div className="text-center py-12" style={{ color: "#94a3b8" }}>
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Chưa có câu hỏi nào</p>
          <p className="text-xs mt-1">Thêm câu hỏi thảo luận bằng form phía trên</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-xl p-4 transition-all duration-150 card-hover"
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderLeft: "4px solid #6366f1",
              }}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex gap-3 flex-1 min-w-0">
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "#eef2ff", color: "#4f46e5" }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-1 truncate" style={{ color: "#0f172a" }}>{q.question}</p>
                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#64748b" }}>{q.answer}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEdit(q)}
                    className="p-2 rounded-lg transition-all duration-150"
                    style={{ color: "#4f46e5", border: "1.5px solid #c7d2fe", background: "#eef2ff" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#e0e7ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#eef2ff")}
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(q.id)}
                    className="p-2 rounded-lg transition-all duration-150"
                    style={{ color: "#ef4444", border: "1.5px solid #fecaca", background: "#fef2f2" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fee2e2")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fef2f2")}
                    title="Xoá"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sortable Exam Wrapper ─────────────────────────────────────────────────────
function SortableExamWrapper({
  id,
  children,
}: {
  id: string;
  children: (dragAttributes: any, dragListeners: any) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children(attributes, listeners)}
    </div>
  );
}

// ── Exam Tab ──────────────────────────────────────────────────────────────────
function ExamTab({
  exam,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  editingExam,
  setEditingExam,
  showExamForm,
  setShowExamForm,
  examType,
  setExamType,
  sensors,
}: {
  exam: ExamQuestion[];
  onAdd: (e: ExamQuestion) => void;
  onUpdate: (e: ExamQuestion) => void;
  onDelete: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  editingExam: ExamQuestion | null;
  setEditingExam: (e: ExamQuestion | null) => void;
  showExamForm: boolean;
  setShowExamForm: (show: boolean) => void;
  examType: ExamQuestion["type"];
  setExamType: (type: ExamQuestion["type"]) => void;
  sensors: any;
}) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  return (
    <div>
      {!showExamForm && !editingExam && (
        <button
          onClick={() => setShowExamForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 mb-4"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <Plus className="w-4 h-4" />
          Thêm câu hỏi kiểm tra
        </button>
      )}

      {(showExamForm || editingExam) && (
        <ExamFormDialog
          examType={examType}
          setExamType={setExamType}
          onSubmit={(data) => {
            if (editingExam) {
              onUpdate(data);
              setEditingExam(null);
            } else {
              onAdd(data);
              setShowExamForm(false);
            }
          }}
          onCancel={() => {
            setShowExamForm(false);
            setEditingExam(null);
          }}
          editingExam={editingExam}
          sensors={sensors}
          examCount={exam.length}
        />
      )}

      {exam.length === 0 && !showExamForm && !editingExam ? (
        <div className="text-center py-16" style={{ color: "#94a3b8" }}>
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Chưa có câu hỏi kiểm tra</p>
          <p className="text-xs mt-1">Nhấn nút phía trên để thêm câu hỏi đầu tiên</p>
        </div>
      ) : (
        <div className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={exam.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              {exam.map((e) => (
                <SortableExamWrapper key={e.id} id={e.id}>
                  {(attributes, listeners) => (
                    <ExamQuestionCard
                      exam={e}
                      onEdit={() => {
                        setEditingExam(e);
                        setExamType(e.type);
                      }}
                      onDelete={() => onDelete(e.id)}
                      dragAttributes={attributes}
                      dragListeners={listeners}
                    />
                  )}
                </SortableExamWrapper>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

// ── Field Components ──────────────────────────────────────────────────────────
function MultipleChoiceFields({
  formData,
  setFormData,
  multiple = false,
}: {
  formData: any;
  setFormData: any;
  multiple?: boolean;
}) {
  const choices = formData.choices || [{ text: "", is_correct: false }];

  const addChoice = () => {
    setFormData((prev: any) => ({
      ...prev,
      choices: [...(prev.choices || []), { text: "", is_correct: false }],
    }));
  };

  const updateChoice = (index: number, field: "text" | "is_correct", value: any) => {
    const newChoices = [...choices];
    if (field === "is_correct" && !multiple && value === true) {
      newChoices.forEach((c, i) => { newChoices[i] = { ...c, is_correct: false }; });
    }
    newChoices[index] = { ...newChoices[index], [field]: value };
    setFormData((prev: any) => ({ ...prev, choices: newChoices }));
  };

  const removeChoice = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      choices: prev.choices.filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
        Các đáp án
      </label>
      {choices.map((choice: ExamChoice, index: number) => (
        <div key={index} className="flex gap-2 items-center">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
            style={{ background: choice.is_correct ? "#ecfdf5" : "#f1f5f9", color: choice.is_correct ? "#059669" : "#94a3b8" }}
          >
            {String.fromCharCode(65 + index)}
          </div>
          <input
            type="text"
            value={choice.text}
            onChange={(e) => updateChoice(index, "text", e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-150"
            style={{
              border: `1.5px solid ${choice.is_correct ? "#6ee7b7" : "#e2e8f0"}`,
              color: "#0f172a",
              outline: "none",
              background: choice.is_correct ? "#f0fdf4" : "#ffffff",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
            onBlur={e => (e.currentTarget.style.borderColor = choice.is_correct ? "#6ee7b7" : "#e2e8f0")}
            placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
            required
          />
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type={multiple ? "checkbox" : "radio"}
              name={multiple ? undefined : "single_correct_choice"}
              checked={choice.is_correct}
              onChange={(e) => updateChoice(index, "is_correct", e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-xs font-medium" style={{ color: "#64748b" }}>Đúng</span>
          </label>
          {choices.length > 1 && (
            <button
              type="button"
              onClick={() => removeChoice(index)}
              className="p-1.5 rounded-lg transition-all duration-150"
              style={{ color: "#ef4444" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addChoice}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 mt-1"
        style={{ color: "#4f46e5", background: "#eef2ff" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#e0e7ff")}
        onMouseLeave={e => (e.currentTarget.style.background = "#eef2ff")}
      >
        <Plus className="w-3 h-3" />
        Thêm đáp án
      </button>
    </div>
  );
}

function TrueFalseFields({ formData, setFormData }: { formData: any; setFormData: any }) {
  const isTrue = formData.answer?.toString() !== "false";
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
        Đáp án đúng
      </label>
      <div className="flex gap-3">
        {[{ value: "true", label: "Đúng", icon: "✓" }, { value: "false", label: "Sai", icon: "✗" }].map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFormData((prev: any) => ({ ...prev, answer: opt.value === "true" }))}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2"
            style={{
              border: `2px solid ${(opt.value === "true") === isTrue ? (opt.value === "true" ? "#059669" : "#ef4444") : "#e2e8f0"}`,
              background: (opt.value === "true") === isTrue ? (opt.value === "true" ? "#ecfdf5" : "#fef2f2") : "#f8fafc",
              color: (opt.value === "true") === isTrue ? (opt.value === "true" ? "#059669" : "#ef4444") : "#94a3b8",
            }}
          >
            <span className="text-lg">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
      {/* Hidden select for form value */}
      <select
        value={formData.answer?.toString() || "true"}
        onChange={(e) => setFormData((prev: any) => ({ ...prev, answer: e.target.value === "true" }))}
        className="sr-only"
      >
        <option value="true">Đúng</option>
        <option value="false">Sai</option>
      </select>
    </div>
  );
}

function ScenarioFields({ formData, setFormData }: { formData: any; setFormData: any }) {
  const options = formData.options || [""];

  const addOption = () => {
    setFormData((prev: any) => ({ ...prev, options: [...(prev.options || []), ""] }));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setFormData((prev: any) => ({ ...prev, options: newOptions }));
  };

  const removeOption = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      options: prev.options.filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
        Các lựa chọn
      </label>
      {options.map((option: string, index: number) => (
        <div key={index} className="flex gap-2 items-center">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
            style={{
              background: index === (formData.correct_answer ?? 0) ? "#fffbeb" : "#f1f5f9",
              color: index === (formData.correct_answer ?? 0) ? "#d97706" : "#94a3b8",
              border: `1.5px solid ${index === (formData.correct_answer ?? 0) ? "#fcd34d" : "#e2e8f0"}`,
            }}
          >
            {index + 1}
          </span>
          <input
            type="text"
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-150"
            style={{ border: "1.5px solid #e2e8f0", color: "#0f172a", outline: "none" }}
            onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
            placeholder={`Lựa chọn ${index + 1}`}
            required
          />
          {options.length > 1 && (
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="p-1.5 rounded-lg transition-all duration-150"
              style={{ color: "#ef4444" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addOption}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
        style={{ color: "#4f46e5", background: "#eef2ff" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#e0e7ff")}
        onMouseLeave={e => (e.currentTarget.style.background = "#eef2ff")}
      >
        <Plus className="w-3 h-3" />
        Thêm lựa chọn
      </button>

      <div className="pt-2">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
          Đáp án đúng
        </label>
        <div className="flex flex-wrap gap-2">
          {options.map((_: string, index: number) => (
            <button
              key={index}
              type="button"
              onClick={() => setFormData((prev: any) => ({ ...prev, correct_answer: index }))}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
              style={{
                background: (formData.correct_answer ?? 0) === index ? "#fffbeb" : "#f1f5f9",
                color: (formData.correct_answer ?? 0) === index ? "#d97706" : "#64748b",
                border: `1.5px solid ${(formData.correct_answer ?? 0) === index ? "#fcd34d" : "#e2e8f0"}`,
              }}
            >
              Lựa chọn {index + 1}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="1"
          max={options.length}
          value={(formData.correct_answer ?? 0) + 1}
          onChange={(e) =>
            setFormData((prev: any) => ({ ...prev, correct_answer: parseInt(e.target.value) - 1 }))
          }
          className="sr-only"
          required
        />
      </div>
    </div>
  );
}

function CalculationFields({ formData, setFormData }: { formData: any; setFormData: any }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>
          Biểu thức tính toán
        </label>
        <input
          type="text"
          value={formData.expression || ""}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, expression: e.target.value }))}
          className="w-full px-3.5 py-2.5 rounded-lg text-sm font-mono transition-all duration-150"
          style={{ border: "1.5px solid #e2e8f0", color: "#0f172a", outline: "none" }}
          onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
          onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
          placeholder="30 * 1.05 = 31.5"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>
          Đáp án đúng (số)
        </label>
        <input
          type="number"
          step="any"
          value={formData.correct_answer ?? ""}
          onChange={(e) =>
            setFormData((prev: any) => ({ ...prev, correct_answer: parseFloat(e.target.value) }))
          }
          className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150"
          style={{ border: "1.5px solid #e2e8f0", color: "#0f172a", outline: "none" }}
          onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
          onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
          required
        />
      </div>
    </div>
  );
}

function MatchingFields({ formData, setFormData }: { formData: any; setFormData: any }) {
  const pairs = formData.pairs || [{ left: "", right: "" }];

  const addPair = () => {
    setFormData((prev: any) => ({ ...prev, pairs: [...(prev.pairs || []), { left: "", right: "" }] }));
  };

  const updatePair = (index: number, field: "left" | "right", value: string) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    setFormData((prev: any) => ({ ...prev, pairs: newPairs }));
  };

  const removePair = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      pairs: prev.pairs.filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748b" }}>
        Cặp đáp án
      </label>
      {pairs.map((pair: ExamPair, index: number) => (
        <div key={index} className="flex gap-2 items-center">
          <input
            type="text"
            value={pair.left}
            onChange={(e) => updatePair(index, "left", e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-150"
            style={{ border: "1.5px solid #e2e8f0", color: "#0f172a", outline: "none" }}
            onFocus={e => (e.currentTarget.style.borderColor = "#06b6d4")}
            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
            placeholder="Bên trái"
            required
          />
          <span className="shrink-0 p-1.5 rounded-lg" style={{ background: "#ecfeff", color: "#0891b2" }}>
            <ArrowLeftRight className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={pair.right}
            onChange={(e) => updatePair(index, "right", e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-150"
            style={{ border: "1.5px solid #e2e8f0", color: "#0f172a", outline: "none" }}
            onFocus={e => (e.currentTarget.style.borderColor = "#06b6d4")}
            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
            placeholder="Bên phải"
            required
          />
          {pairs.length > 1 && (
            <button
              type="button"
              onClick={() => removePair(index)}
              className="p-1.5 rounded-lg transition-all duration-150"
              style={{ color: "#ef4444" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addPair}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 mt-1"
        style={{ color: "#0891b2", background: "#ecfeff" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#cffafe")}
        onMouseLeave={e => (e.currentTarget.style.background = "#ecfeff")}
      >
        <Plus className="w-3 h-3" />
        Thêm cặp
      </button>
    </div>
  );
}

function OrderingFields({
  items,
  setItems,
  sensors,
  handleDragEnd,
}: {
  items: string[];
  setItems: (items: string[]) => void;
  sensors: any;
  handleDragEnd: (event: DragEndEvent) => void;
}) {
  const addItem = () => setItems([...items, ""]);

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
        Các bước — kéo thả để sắp xếp thứ tự đúng
      </label>
      <p className="text-xs" style={{ color: "#94a3b8" }}>
        Số thứ tự hiển thị là thứ tự đúng sau khi sắp xếp
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((_, idx) => idx.toString())} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableItem key={index} id={index.toString()}>
              <div
                className="flex gap-2 items-center p-2 rounded-xl transition-all duration-150"
                style={{ background: "#ffffff", border: "1.5px solid #e2e8f0" }}
              >
                <div className="p-1 rounded cursor-move" style={{ color: "#94a3b8" }}>
                  <GripVertical className="w-4 h-4" />
                </div>
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
                  style={{ background: "#fdf2f8", color: "#db2777", border: "1.5px solid #fbcfe8" }}
                >
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                  style={{ border: "1.5px solid #e2e8f0", color: "#0f172a", outline: "none" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#db2777")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  placeholder={`Bước ${index + 1}`}
                  required
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1.5 rounded-lg transition-all duration-150"
                    style={{ color: "#ef4444" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 mt-1"
        style={{ color: "#db2777", background: "#fdf2f8" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#fce7f3")}
        onMouseLeave={e => (e.currentTarget.style.background = "#fdf2f8")}
      >
        <Plus className="w-3 h-3" />
        Thêm bước
      </button>
    </div>
  );
}

// ── Exam Question Card ────────────────────────────────────────────────────────
function ExamQuestionCard({
  exam,
  onEdit,
  onDelete,
  dragAttributes,
  dragListeners,
}: {
  exam: ExamQuestion;
  onEdit: () => void;
  onDelete: () => void;
  dragAttributes?: any;
  dragListeners?: any;
}) {
  const meta = TYPE_META[exam.type] || { label: exam.type, color: "#64748b", bg: "#f8fafc" };

  return (
    <div
      className="rounded-xl p-4 transition-all duration-150 card-hover"
      style={{
        background: "#ffffff",
        border: "1.5px solid #e2e8f0",
        borderLeft: `4px solid ${meta.color}`,
      }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex gap-2 items-start flex-1 min-w-0">
          {dragAttributes && dragListeners && (
            <div
              {...dragAttributes}
              {...dragListeners}
              className="cursor-move mt-0.5 shrink-0 p-1 rounded"
              style={{ color: "#94a3b8" }}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>
              <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>{exam.id}</span>
            </div>
            <p className="font-semibold text-sm mb-3 leading-snug" style={{ color: "#0f172a" }}>
              {exam.question}
            </p>
            <div className="text-sm" style={{ color: "#64748b" }}>
              {(exam.type === "multiple_choice" || exam.type === "multiple_answer_choise") ? (
                <ul className="space-y-1">
                  {exam.choices.map((choice, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: choice.is_correct ? "#ecfdf5" : "#f1f5f9",
                          color: choice.is_correct ? "#059669" : "#94a3b8",
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className={choice.is_correct ? "font-semibold" : ""} style={{ color: choice.is_correct ? "#059669" : "#64748b" }}>
                        {choice.text}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : exam.type === "true_false" ? (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: exam.answer ? "#ecfdf5" : "#fef2f2",
                    color: exam.answer ? "#059669" : "#ef4444",
                  }}
                >
                  {exam.answer ? "✓ Đúng" : "✗ Sai"}
                </span>
              ) : exam.type === "scenario_question" ? (
                <ul className="space-y-1">
                  {exam.options.map((opt, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: idx === exam.correct_answer ? "#fffbeb" : "#f1f5f9",
                          color: idx === exam.correct_answer ? "#d97706" : "#94a3b8",
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span className={idx === exam.correct_answer ? "font-semibold" : ""} style={{ color: idx === exam.correct_answer ? "#d97706" : "#64748b" }}>
                        {opt}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : exam.type === "calculation" ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "#94a3b8" }}>Biểu thức:</span>
                    <code className="px-2 py-0.5 rounded text-xs" style={{ background: "#fff7ed", color: "#ea580c" }}>{exam.expression}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "#94a3b8" }}>Đáp án:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: "#ecfdf5", color: "#059669" }}>{exam.correct_answer}</span>
                  </div>
                </div>
              ) : exam.type === "matching" ? (
                <ul className="space-y-1">
                  {exam.pairs.map((pair, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded" style={{ background: "#ecfeff", color: "#0891b2" }}>{pair.left}</span>
                      <ArrowLeftRight className="w-3 h-3 shrink-0" style={{ color: "#94a3b8" }} />
                      <span className="px-2 py-1 rounded" style={{ background: "#ecfeff", color: "#0891b2" }}>{pair.right}</span>
                    </li>
                  ))}
                </ul>
              ) : exam.type === "ordering" ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Thứ tự hiển thị:</p>
                    <ol className="space-y-1">
                      {exam.items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0"
                            style={{ background: "#f1f5f9", color: "#64748b" }}
                          >
                            {idx + 1}
                          </span>
                          <span style={{ color: "#64748b" }}>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: "#059669" }}>Thứ tự đúng:</p>
                    <ol className="space-y-1">
                      {exam.correct_order.map((itemIndex, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0"
                            style={{ background: "#fdf2f8", color: "#db2777" }}
                          >
                            {idx + 1}
                          </span>
                          <span style={{ color: "#059669", fontWeight: 600 }}>{exam.items[itemIndex]}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg transition-all duration-150"
            style={{ color: "#4f46e5", border: "1.5px solid #c7d2fe", background: "#eef2ff" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e0e7ff")}
            onMouseLeave={e => (e.currentTarget.style.background = "#eef2ff")}
            title="Chỉnh sửa"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg transition-all duration-150"
            style={{ color: "#ef4444", border: "1.5px solid #fecaca", background: "#fef2f2" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fee2e2")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fef2f2")}
            title="Xoá"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
