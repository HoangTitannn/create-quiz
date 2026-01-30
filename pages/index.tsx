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

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Export JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(quizData, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "quiz.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setImportJsonText(JSON.stringify(json, null, 2));
        } catch (error) {
          toast.error("Lỗi đọc file JSON", {
            duration: 3000,
            position: "top-right",
          });
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
      toast.success("Import thành công!", {
        duration: 3000,
        position: "top-right",
      });
    } catch (error) {
      toast.error("Lỗi: JSON không hợp lệ. Vui lòng kiểm tra lại cú pháp.", {
        duration: 4000,
        position: "top-right",
      });
    }
  };

  // Questions CRUD
  const addQuestion = (question: Question) => {
    setQuizData((prev) => ({
      ...prev,
      questions: [...prev.questions, question],
    }));
  };

  const updateQuestion = (question: Question) => {
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === question.id ? question : q)),
    }));
  };

  const deleteQuestion = (id: string) => {
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  };

  // Exam CRUD
  const addExam = (exam: ExamQuestion) => {
    setQuizData((prev) => ({
      ...prev,
      exam: [...prev.exam, exam],
    }));
  };

  const updateExam = (exam: ExamQuestion) => {
    setQuizData((prev) => ({
      ...prev,
      exam: prev.exam.map((e) => (e.id === exam.id ? exam : e)),
    }));
  };

  const deleteExam = (id: string) => {
    setQuizData((prev) => ({
      ...prev,
      exam: prev.exam.filter((e) => e.id !== id),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Toaster />
      <div className="max-w-6xl mx-auto pt-10">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Quản lý Quiz</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportDialog(true)}
                className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
              >
                <FileUp className="w-4 h-4" />
                Import JSON
              </button>
              <button
                onClick={handleExport}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Export JSON
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b mb-6">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-4 py-2 font-medium ${
                activeTab === "info"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Thông tin
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`px-4 py-2 font-medium ${
                activeTab === "questions"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Câu hỏi thảo luận ({quizData.questions.length})
            </button>
            <button
              onClick={() => setActiveTab("exam")}
              className={`px-4 py-2 font-medium ${
                activeTab === "exam"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Bài kiểm tra ({quizData.exam.length})
            </button>
          </div>

          {/* Tab Content */}
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

      {/* Import Dialog */}
      {showImportDialog && (
        <ImportDialog
          importJsonText={importJsonText}
          setImportJsonText={setImportJsonText}
          onImport={handleImportFromText}
          onCancel={() => {
            setShowImportDialog(false);
            setImportJsonText("");
          }}
          onFileUpload={handleImport}
        />
      )}
    </div>
  );
}

// Info Tab Component
function InfoTab({
  quizData,
  setQuizData,
}: {
  quizData: QuizData;
  setQuizData: React.Dispatch<React.SetStateAction<QuizData>>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ID Bài học</label>
        <span className="text-xs text-gray-500 mb-4">Ví dụ: lessons/PTKT/CH07-LS02.pdf</span>
        <input
          type="text"
          value={quizData.id}
          onChange={(e) => setQuizData((prev) => ({ ...prev, id: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="lessons/PTKT/CH07-LS02.pdf"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tóm tắt bài học</label>
        <textarea
          value={quizData.summary}
          onChange={(e) => setQuizData((prev) => ({ ...prev, summary: e.target.value }))}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nhập tóm tắt bài học..."
        />
      </div>
    </div>
  );
}

// Questions Tab Component
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
  const [formData, setFormData] = useState<Question>({
    id: "",
    question: "",
    answer: "",
  });

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

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">
          {editingQuestion ? "Sửa câu hỏi thảo luận" : "Thêm câu hỏi thảo luận"}
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ID</label>
          <input
            type="text"
            value={formData.id}
            onChange={(e) => setFormData((prev) => ({ ...prev, id: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
            placeholder="q1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Câu hỏi</label>
          <input
            type="text"
            value={formData.question}
            onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Đáp án</label>
          <textarea
            value={formData.answer}
            onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
            required
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {editingQuestion ? "Cập nhật" : "Thêm"}
          </button>
          {editingQuestion && (
            <button
              type="button"
              onClick={() => {
                setEditingQuestion(null);
                setFormData({ id: "", question: "", answer: "" });
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Huỷ
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.id} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-end gap-2">
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">ID: {q.id}</div>
                <div className="font-semibold text-gray-700 mb-2">{q.question}</div>
                <div className="text-gray-500 text-sm">{q.answer}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(q)}
                  className="text-blue-500 hover:text-blue-700 px-3 py-1 flex items-center gap-1 rounded-md border border-blue-500 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(q.id)}
                  className="text-red-500 hover:text-red-700 px-3 py-1 flex items-center gap-1 rounded-md border border-red-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Exam Tab Component
function ExamTab({
  exam,
  onAdd,
  onUpdate,
  onDelete,
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
  editingExam: ExamQuestion | null;
  setEditingExam: (e: ExamQuestion | null) => void;
  showExamForm: boolean;
  setShowExamForm: (show: boolean) => void;
  examType: ExamQuestion["type"];
  setExamType: (type: ExamQuestion["type"]) => void;
  sensors: any;
}) {
  return (
    <div className="space-y-6">
      {!showExamForm && !editingExam && (
        <button
          onClick={() => setShowExamForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
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
        />
      )}

      <div className="space-y-3">
        {exam.map((e) => (
          <ExamQuestionCard
            key={e.id}
            exam={e}
            onEdit={() => {
              setEditingExam(e);
              setExamType(e.type);
            }}
            onDelete={() => onDelete(e.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Exam Form Component
function ExamForm({
  examType,
  setExamType,
  onSubmit,
  onCancel,
  editingExam,
  sensors,
}: {
  examType: ExamQuestion["type"];
  setExamType: (type: ExamQuestion["type"]) => void;
  onSubmit: (data: ExamQuestion) => void;
  onCancel: () => void;
  editingExam: ExamQuestion | null;
  sensors: any;
}) {
  const [formData, setFormData] = useState<any>(
    editingExam || {
      id: "",
      type: examType,
      question: "",
    }
  );

  const [orderingItems, setOrderingItems] = useState<string[]>(
    editingExam?.type === "ordering" ? editingExam.items : [""]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderingItems((items) => {
        const oldIndex = items.findIndex((_, idx) => idx.toString() === active.id);
        const newIndex = items.findIndex((_, idx) => idx.toString() === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (examType === "ordering") {
      const correct_order = orderingItems.map((_, idx) => idx);
      onSubmit({
        ...formData,
        type: examType,
        items: orderingItems,
        correct_order,
      });
    } else {
      onSubmit({ ...formData, type: examType });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-gray-700">
        {editingExam ? "Sửa câu hỏi kiểm tra" : "Thêm câu hỏi kiểm tra"}
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ID</label>
        <input
          type="text"
          value={formData.id}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, id: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
          placeholder="e1"
          required
        />
      </div>

      {!editingExam && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Loại câu hỏi</label>
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value as ExamQuestion["type"])}
            className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
          >
            <option value="multiple_choice">Trắc nghiệm (1 đáp án)</option>
            <option value="multiple_answer_choise">Trắc nghiệm (nhiều đáp án)</option>
            <option value="true_false">Đúng/Sai</option>
            <option value="scenario_question">Câu hỏi tình huống</option>
            <option value="calculation">Tính toán</option>
            <option value="matching">Nối đáp án</option>
            <option value="ordering">Sắp xếp thứ tự</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Câu hỏi</label>
        <textarea
          value={formData.question}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, question: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
          required
        />
      </div>

      {examType === "multiple_choice" && (
        <MultipleChoiceFields formData={formData} setFormData={setFormData} />
      )}

      {examType === "multiple_answer_choise" && (
        <MultipleChoiceFields formData={formData} setFormData={setFormData} multiple />
      )}

      {examType === "true_false" && (
        <TrueFalseFields formData={formData} setFormData={setFormData} />
      )}

      {examType === "scenario_question" && (
        <ScenarioFields formData={formData} setFormData={setFormData} />
      )}

      {examType === "calculation" && (
        <CalculationFields formData={formData} setFormData={setFormData} />
      )}

      {examType === "matching" && (
        <MatchingFields formData={formData} setFormData={setFormData} />
      )}

      {examType === "ordering" && (
        <OrderingFields
          items={orderingItems}
          setItems={setOrderingItems}
          sensors={sensors}
          handleDragEnd={handleDragEnd}
        />
      )}

      <div className="flex gap-2">
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2">
          <Save className="w-4 h-4" />
          {editingExam ? "Cập nhật" : "Thêm"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          Huỷ
        </button>
      </div>
    </form>
  );
}

// Field Components
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
      <label className="block text-sm font-medium text-gray-700">Đáp án</label>
      {choices.map((choice: ExamChoice, index: number) => (
        <div key={index} className="flex gap-2 items-center">
          <input
            type="text"
            value={choice.text}
            onChange={(e) => updateChoice(index, "text", e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
            placeholder={`Đáp án ${index + 1}`}
            required
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={choice.is_correct}
              onChange={(e) => updateChoice(index, "is_correct", e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Đúng</span>
          </label>
          {choices.length > 1 && (
            <button
              type="button"
              onClick={() => removeChoice(index)}
              className="text-red-500 hover:text-red-700 px-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addChoice}
        className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
      >
        <Plus className="w-3 h-3" />
        Thêm đáp án
      </button>
    </div>
  );
}

function TrueFalseFields({ formData, setFormData }: { formData: any; setFormData: any }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Đáp án đúng</label>
      <select
        value={formData.answer?.toString() || "true"}
        onChange={(e) => setFormData((prev: any) => ({ ...prev, answer: e.target.value === "true" }))}
        className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
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
    setFormData((prev: any) => ({
      ...prev,
      options: [...(prev.options || []), ""],
    }));
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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Các lựa chọn</label>
      {options.map((option: string, index: number) => (
        <div key={index} className="flex gap-2">
          <span className="flex items-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 min-w-[40px] justify-center">
            {index + 1}
          </span>
          <input
            type="text"
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
            placeholder={`Lựa chọn ${index + 1}`}
            required
          />
          {options.length > 1 && (
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="text-red-500 hover:text-red-700 px-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addOption}
        className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
      >
        <Plus className="w-3 h-3" />
        Thêm lựa chọn
      </button>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
          Đáp án đúng (chọn số thứ tự)
        </label>
        <input
          type="number"
          min="1"
          max={options.length}
          value={(formData.correct_answer ?? 0) + 1}
          onChange={(e) =>
            setFormData((prev: any) => ({ ...prev, correct_answer: parseInt(e.target.value) - 1 }))
          }
          className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Nhập số thứ tự của đáp án đúng (1 = lựa chọn đầu tiên, 2 = lựa chọn thứ hai, ...)
        </p>
      </div>
    </div>
  );
}

function CalculationFields({ formData, setFormData }: { formData: any; setFormData: any }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Biểu thức tính toán</label>
        <input
          type="text"
          value={formData.expression || ""}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, expression: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="30 * 1.05 = 31.5"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Đáp án đúng (số)</label>
        <input
          type="number"
          step="any"
          value={formData.correct_answer ?? ""}
          onChange={(e) =>
            setFormData((prev: any) => ({ ...prev, correct_answer: parseFloat(e.target.value) }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          required
        />
      </div>
    </div>
  );
}

function MatchingFields({ formData, setFormData }: { formData: any; setFormData: any }) {
  const pairs = formData.pairs || [{ left: "", right: "" }];

  const addPair = () => {
    setFormData((prev: any) => ({
      ...prev,
      pairs: [...(prev.pairs || []), { left: "", right: "" }],
    }));
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
      <label className="block text-sm font-medium text-gray-700">Cặp đáp án</label>
      {pairs.map((pair: ExamPair, index: number) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={pair.left}
            onChange={(e) => updatePair(index, "left", e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
            placeholder="Bên trái"
            required
          />
          <span className="flex items-center px-2">
            <ArrowLeftRight className="w-4 h-4 text-gray-400" />
          </span>
          <input
            type="text"
            value={pair.right}
            onChange={(e) => updatePair(index, "right", e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
            placeholder="Bên phải"
            required
          />
          {pairs.length > 1 && (
            <button
              type="button"
              onClick={() => removePair(index)}
              className="text-red-500 hover:text-red-700 px-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addPair}
        className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
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
  const addItem = () => {
    setItems([...items, ""]);
  };

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
      <label className="block text-sm font-medium text-gray-700">
        Các bước (kéo thả để sắp xếp thứ tự đúng)
      </label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((_, idx) => idx.toString())} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableItem key={index} id={index.toString()}>
              <div className="flex gap-2 items-center bg-white p-2 rounded border">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                <span className="text-sm text-gray-500 w-8">{index + 1}.</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={`Bước ${index + 1}`}
                  required
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    <X className="w-4 h-4" />
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
        className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
      >
        <Plus className="w-3 h-3" />
        Thêm bước
      </button>
    </div>
  );
}

// Exam Question Card Component
function ExamQuestionCard({
  exam,
  onEdit,
  onDelete,
}: {
  exam: ExamQuestion;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      multiple_choice: "Trắc nghiệm (1 đáp án)",
      multiple_answer_choise: "Trắc nghiệm (nhiều đáp án)",
      true_false: "Đúng/Sai",
      scenario_question: "Câu hỏi tình huống",
      calculation: "Tính toán",
      matching: "Nối đáp án",
      ordering: "Sắp xếp thứ tự",
    };
    return labels[type] || type;
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">ID: {exam.id}</span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {getTypeLabel(exam.type)}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="text-blue-500 hover:text-blue-700 px-3 py-1 flex items-center gap-1 rounded-md border border-blue-500 cursor-pointer">
            <Edit2 className="w-4 h-4" />

          </button>
          <button onClick={onDelete} className="text-red-500 hover:text-red-700 px-3 py-1 flex items-center gap-1 rounded-md border border-red-500 cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="font-semibold text-gray-700 mb-2">{exam.question}</div>
      <div className="text-sm text-gray-600">
        {exam.type === "multiple_choice" || exam.type === "multiple_answer_choise" ? (
          <ul className="list-disc list-inside">
            {exam.choices.map((choice, idx) => (
              <li key={idx} className={choice.is_correct ? "text-green-600 font-medium" : ""}>
                {choice.text}
              </li>
            ))}
          </ul>
        ) : exam.type === "true_false" ? (
          <span>Đáp án: {exam.answer ? "Đúng" : "Sai"}</span>
        ) : exam.type === "scenario_question" ? (
          <div>
            <ul className="list-none">
              {exam.options.map((opt, idx) => (
                <li key={idx} className={idx === exam.correct_answer ? "text-green-600 font-medium" : ""}>
                  {idx + 1}. {opt}
                  {idx === exam.correct_answer && " ✓"}
                </li>
              ))}
            </ul>
            <div className="mt-2 text-xs bg-green-50 text-green-700 px-2 py-1 rounded inline-block">
              Đáp án đúng: {exam.correct_answer + 1}
            </div>
          </div>
        ) : exam.type === "calculation" ? (
          <div>
            <div>Biểu thức: {exam.expression}</div>
            <div>Đáp án: {exam.correct_answer}</div>
          </div>
        ) : exam.type === "matching" ? (
          <ul className="list-disc list-inside">
            {exam.pairs.map((pair, idx) => (
              <li key={idx}>
                {pair.left} ↔ {pair.right}
              </li>
            ))}
          </ul>
        ) : exam.type === "ordering" ? (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Thứ tự đúng:</div>
            <ul className="list-decimal list-inside space-y-1">
              {exam.correct_order.map((itemIndex, idx) => (
                <li key={idx} className="text-green-600 font-medium">{exam.items[itemIndex]}</li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-gray-500">
              <div className="font-medium mb-1">Danh sách ban đầu (chưa sắp xếp):</div>
              <ul className="list-none ml-4 space-y-1">
                {exam.items.map((item, idx) => {
                  // Tìm vị trí của item này trong correct_order (vị trí trong thứ tự đúng)
                  const correctPosition = exam.correct_order.indexOf(idx) + 1;
                  return (
                    <li key={idx}>
                      <span className="inline-block w-6 text-center font-medium">{correctPosition}.</span>
                      {item}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
