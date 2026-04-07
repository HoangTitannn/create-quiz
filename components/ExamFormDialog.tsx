import { useState } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  GripVertical,
  X,
  ArrowLeftRight,
  Save,
  XCircle,
  Shuffle,
} from "lucide-react";

// Types
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

interface ExamFormDialogProps {
  examType: ExamQuestion["type"];
  setExamType: (type: ExamQuestion["type"]) => void;
  onSubmit: (data: ExamQuestion) => void;
  onCancel: () => void;
  editingExam: ExamQuestion | null;
  sensors: any;
  examCount?: number;
}

const TYPE_OPTIONS: { value: ExamQuestion["type"]; label: string; color: string }[] = [
  { value: "multiple_choice",        label: "Trắc nghiệm (1 đáp án)",      color: "#4f46e5" },
  { value: "multiple_answer_choise", label: "Trắc nghiệm (nhiều đáp án)",   color: "#7c3aed" },
  { value: "true_false",             label: "Đúng / Sai",                   color: "#059669" },
  { value: "scenario_question",      label: "Câu hỏi tình huống",           color: "#d97706" },
  { value: "calculation",            label: "Tính toán",                    color: "#ea580c" },
  { value: "matching",               label: "Nối đáp án",                   color: "#0891b2" },
  { value: "ordering",               label: "Sắp xếp thứ tự",              color: "#db2777" },
];

function SortableOrderItem({
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
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children(attributes, listeners)}
    </div>
  );
}

const inputClass = "w-full px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150";
const inputStyle = {
  border: "1.5px solid #e2e8f0",
  color: "#0f172a",
  outline: "none",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function ExamFormDialog({
  examType,
  setExamType,
  onSubmit,
  onCancel,
  editingExam,
  sensors,
  examCount = 0,
}: ExamFormDialogProps) {
  const [formData, setFormData] = useState<any>(
    editingExam || {
      id: `e${examCount + 1}`,
      type: examType,
      question: "",
    }
  );

  const [correctOrderItems, setCorrectOrderItems] = useState<string[]>(() => {
    if (editingExam?.type === "ordering") {
      return editingExam.correct_order.map(idx => editingExam.items[idx]);
    }
    return [""];
  });

  const [displayOrder, setDisplayOrder] = useState<number[]>(() => {
    if (editingExam?.type === "ordering") {
      return editingExam.items.map((_, displayPos) =>
        editingExam.correct_order.indexOf(displayPos)
      );
    }
    return [0];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (examType === "ordering") {
      const items = displayOrder.map(idx => correctOrderItems[idx]);
      const correct_order = correctOrderItems.map((_, i) => displayOrder.indexOf(i));
      onSubmit({
        ...formData,
        type: examType,
        items,
        correct_order,
      });
    } else {
      const submitData = { ...formData, type: examType };
      if (examType === "true_false" && submitData.answer === undefined) {
        submitData.answer = true;
      }
      onSubmit(submitData);
    }
  };

  const selectedTypeMeta = TYPE_OPTIONS.find(t => t.value === examType);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in"
      style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl w-full max-h-[92vh] flex flex-col animate-scale-in"
        style={{
          maxWidth: "680px",
          boxShadow: "0 24px 64px -8px rgba(15,23,42,0.28), 0 0 0 1px rgba(15,23,42,0.06)",
        }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center px-6 py-5"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: "#0f172a", fontFamily: "'Sora', sans-serif" }}
            >
              {editingExam ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi kiểm tra"}
            </h2>
            {selectedTypeMeta && (
              <span
                className="text-xs font-semibold mt-0.5 inline-block"
                style={{ color: selectedTypeMeta.color }}
              >
                {selectedTypeMeta.label}
              </span>
            )}
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl transition-all duration-150"
            style={{ color: "#94a3b8", background: "#f8fafc" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9";
              (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc";
              (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ID */}
          <div className="flex gap-4">
            <div className="w-32 shrink-0">
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>
                ID
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => editingExam && setFormData((prev: any) => ({ ...prev, id: e.target.value }))}
                readOnly={!editingExam}
                className={inputClass}
                style={{
                  ...inputStyle,
                  background: !editingExam ? "#f8fafc" : "#ffffff",
                  cursor: !editingExam ? "not-allowed" : "text",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
                onFocus={e => editingExam && (e.currentTarget.style.borderColor = "#6366f1")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                required
              />
              {!editingExam && (
                <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Tự động gán</p>
              )}
            </div>

            {/* Type */}
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>
                Loại câu hỏi
              </label>
              <div className="relative">
                <select
                  value={examType}
                  onChange={(e) => {
                    const newType = e.target.value as ExamQuestion["type"];
                    setExamType(newType);
                    setFormData((prev: any) => ({ ...prev, type: newType }));
                  }}
                  className={inputClass}
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    paddingRight: "2.5rem",
                    fontWeight: 600,
                    color: selectedTypeMeta?.color || "#0f172a",
                    background: "#f8fafc",
                    cursor: "pointer",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  {TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#94a3b8" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 8L1 3h10L6 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "#f1f5f9" }} />

          {/* Question */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>
              Nội dung câu hỏi
            </label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, question: e.target.value }))}
              rows={3}
              className={`${inputClass} resize-none`}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
              placeholder="Nhập nội dung câu hỏi..."
              required
            />
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "#f1f5f9" }} />

          {/* Type-specific fields */}
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
              correctOrderItems={correctOrderItems}
              setCorrectOrderItems={setCorrectOrderItems}
              displayOrder={displayOrder}
              setDisplayOrder={setDisplayOrder}
              sensors={sensors}
            />
          )}
        </form>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-6 py-4 rounded-b-2xl"
          style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{ background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e2e8f0")}
            onMouseLeave={e => (e.currentTarget.style.background = "#f1f5f9")}
          >
            <XCircle className="w-4 h-4" />
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Save className="w-4 h-4" />
            {editingExam ? "Cập nhật" : "Thêm câu hỏi"}
          </button>
        </div>
      </div>
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
    <div className="space-y-2.5">
      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
        Các đáp án {multiple ? "(chọn nhiều)" : "(chọn 1)"}
      </label>
      {choices.map((choice: ExamChoice, index: number) => (
        <div
          key={index}
          className="flex gap-2.5 items-center rounded-xl p-2.5 transition-all duration-150"
          style={{
            background: choice.is_correct ? "#f0fdf4" : "#f8fafc",
            border: `1.5px solid ${choice.is_correct ? "#6ee7b7" : "#e2e8f0"}`,
          }}
        >
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
            style={{
              background: choice.is_correct ? "#059669" : "#e2e8f0",
              color: choice.is_correct ? "#ffffff" : "#94a3b8",
            }}
          >
            {String.fromCharCode(65 + index)}
          </div>
          <input
            type="text"
            value={choice.text}
            onChange={(e) => updateChoice(index, "text", e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-150"
            style={{
              border: "1.5px solid transparent",
              color: "#0f172a",
              outline: "none",
              background: "#ffffff",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
            onBlur={e => (e.currentTarget.style.borderColor = "transparent")}
            placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
            required
          />
          <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <input
              type={multiple ? "checkbox" : "radio"}
              name={multiple ? undefined : "single_correct_choice"}
              checked={choice.is_correct}
              onChange={(e) => updateChoice(index, "is_correct", e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-xs font-semibold" style={{ color: "#64748b" }}>Đúng</span>
          </label>
          {choices.length > 1 && (
            <button
              type="button"
              onClick={() => removeChoice(index)}
              className="p-1 rounded-lg transition-all duration-150 shrink-0"
              style={{ color: "#94a3b8" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addChoice}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
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
      <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#64748b" }}>
        Đáp án đúng
      </label>
      <div className="flex gap-3">
        {[
          { value: "true",  label: "Đúng", icon: "✓", activeColor: "#059669", activeBg: "#ecfdf5", activeBorder: "#6ee7b7" },
          { value: "false", label: "Sai",  icon: "✗", activeColor: "#ef4444", activeBg: "#fef2f2", activeBorder: "#fca5a5" },
        ].map(opt => {
          const isSelected = (opt.value === "true") === isTrue;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFormData((prev: any) => ({ ...prev, answer: opt.value === "true" }))}
              className="flex-1 py-4 rounded-2xl font-bold text-base transition-all duration-150 flex flex-col items-center justify-center gap-1"
              style={{
                border: `2px solid ${isSelected ? opt.activeBorder : "#e2e8f0"}`,
                background: isSelected ? opt.activeBg : "#f8fafc",
                color: isSelected ? opt.activeColor : "#94a3b8",
                boxShadow: isSelected ? `0 2px 8px ${opt.activeBorder}60` : "none",
              }}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-sm">{opt.label}</span>
            </button>
          );
        })}
      </div>
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
  const correctAnswer = formData.correct_answer ?? 0;

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
        Các lựa chọn — click để đánh dấu đáp án đúng
      </label>
      {options.map((option: string, index: number) => {
        const isCorrect = index === correctAnswer;
        return (
          <div
            key={index}
            className="flex gap-2.5 items-center rounded-xl p-2.5 transition-all duration-150"
            style={{
              background: isCorrect ? "#fffbeb" : "#f8fafc",
              border: `1.5px solid ${isCorrect ? "#fcd34d" : "#e2e8f0"}`,
            }}
          >
            <button
              type="button"
              onClick={() => setFormData((prev: any) => ({ ...prev, correct_answer: index }))}
              className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-all duration-150"
              style={{
                background: isCorrect ? "#d97706" : "#e2e8f0",
                color: isCorrect ? "#ffffff" : "#94a3b8",
              }}
              title="Đánh dấu là đáp án đúng"
            >
              {index + 1}
            </button>
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-150"
              style={{ border: "1.5px solid transparent", color: "#0f172a", outline: "none", background: "#ffffff" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
              onBlur={e => (e.currentTarget.style.borderColor = "transparent")}
              placeholder={`Lựa chọn ${index + 1}`}
              required
            />
            {options.length > 1 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="p-1 rounded-lg transition-all duration-150 shrink-0"
                style={{ color: "#94a3b8" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                  (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={addOption}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
        style={{ color: "#d97706", background: "#fffbeb" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#fef3c7")}
        onMouseLeave={e => (e.currentTarget.style.background = "#fffbeb")}
      >
        <Plus className="w-3 h-3" />
        Thêm lựa chọn
      </button>
      <input
        type="number"
        min="1"
        max={options.length}
        value={correctAnswer + 1}
        onChange={(e) =>
          setFormData((prev: any) => ({ ...prev, correct_answer: parseInt(e.target.value) - 1 }))
        }
        className="sr-only"
        required
      />
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
          className={inputClass}
          style={{ ...inputStyle, fontFamily: "monospace", fontSize: "13px" }}
          onFocus={e => (e.currentTarget.style.borderColor = "#ea580c")}
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
          className={inputClass}
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = "#ea580c")}
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
    <div className="space-y-2.5">
      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
        Cặp đáp án
      </label>
      {pairs.map((pair: ExamPair, index: number) => (
        <div key={index} className="flex gap-2 items-center">
          <input
            type="text"
            value={pair.left}
            onChange={(e) => updatePair(index, "left", e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
            style={{ border: "1.5px solid #e2e8f0", color: "#0f172a", outline: "none" }}
            onFocus={e => (e.currentTarget.style.borderColor = "#06b6d4")}
            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
            placeholder="Bên trái"
            required
          />
          <span className="shrink-0 p-2 rounded-xl" style={{ background: "#ecfeff", color: "#0891b2" }}>
            <ArrowLeftRight className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={pair.right}
            onChange={(e) => updatePair(index, "right", e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
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
              className="p-1.5 rounded-lg shrink-0 transition-all duration-150"
              style={{ color: "#94a3b8" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addPair}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
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
  correctOrderItems,
  setCorrectOrderItems,
  displayOrder,
  setDisplayOrder,
  sensors,
}: {
  correctOrderItems: string[];
  setCorrectOrderItems: (items: string[]) => void;
  displayOrder: number[];
  setDisplayOrder: (order: number[]) => void;
  sensors: any;
}) {
  const addItem = () => {
    const newIndex = correctOrderItems.length;
    setCorrectOrderItems([...correctOrderItems, ""]);
    setDisplayOrder([...displayOrder, newIndex]);
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...correctOrderItems];
    newItems[index] = value;
    setCorrectOrderItems(newItems);
  };

  const removeItem = (index: number) => {
    if (correctOrderItems.length <= 1) return;
    setCorrectOrderItems(correctOrderItems.filter((_, i) => i !== index));
    setDisplayOrder(
      displayOrder
        .filter(i => i !== index)
        .map(i => (i > index ? i - 1 : i))
    );
  };

  const shuffleDisplayOrder = () => {
    const shuffled = [...displayOrder];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setDisplayOrder(shuffled);
  };

  const handleDisplayDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = displayOrder.findIndex(i => `d${i}` === active.id);
      const newIdx = displayOrder.findIndex(i => `d${i}` === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        setDisplayOrder(arrayMove(displayOrder, oldIdx, newIdx));
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Section 1: Correct order - enter items */}
      <div className="space-y-2.5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
            Các bước (thứ tự đúng)
          </label>
          <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
            Nhập các bước theo đúng thứ tự cần sắp xếp
          </p>
        </div>
        {correctOrderItems.map((item, index) => (
          <div
            key={index}
            className="flex gap-2.5 items-center p-2.5 rounded-xl transition-all duration-150"
            style={{ background: "#fdf2f8", border: "1.5px solid #fbcfe8" }}
          >
            <span
              className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
              style={{ background: "#db2777", color: "#ffffff" }}
            >
              {index + 1}
            </span>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-150"
              style={{ border: "1.5px solid transparent", color: "#0f172a", outline: "none", background: "#ffffff" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#db2777")}
              onBlur={e => (e.currentTarget.style.borderColor = "transparent")}
              placeholder={`Bước ${index + 1}`}
              required
            />
            {correctOrderItems.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-1 rounded-lg shrink-0 transition-all duration-150"
                style={{ color: "#f9a8d4" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                  (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#f9a8d4";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
          style={{ color: "#db2777", background: "#fdf2f8" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#fce7f3")}
          onMouseLeave={e => (e.currentTarget.style.background = "#fdf2f8")}
        >
          <Plus className="w-3 h-3" />
          Thêm bước
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "#f1f5f9" }} />

      {/* Section 2: Display order (shuffled) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
              Thứ tự hiển thị cho người học
            </label>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
              Kéo thả hoặc nhấn xáo trộn để thay đổi thứ tự
            </p>
          </div>
          <button
            type="button"
            onClick={shuffleDisplayOrder}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 shrink-0"
            style={{ color: "#7c3aed", background: "#f5f3ff" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#ede9fe")}
            onMouseLeave={e => (e.currentTarget.style.background = "#f5f3ff")}
          >
            <Shuffle className="w-3 h-3" />
            Xáo trộn
          </button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDisplayDragEnd}>
          <SortableContext items={displayOrder.map(i => `d${i}`)} strategy={verticalListSortingStrategy}>
            {displayOrder.map((correctIdx, displayIdx) => (
              <SortableOrderItem key={`d${correctIdx}`} id={`d${correctIdx}`}>
                {(dragAttributes, dragListeners) => (
                  <div
                    className="flex gap-2.5 items-center p-2.5 rounded-xl transition-all duration-150"
                    style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                  >
                    <div
                      {...dragAttributes}
                      {...dragListeners}
                      className="p-1 rounded cursor-move shrink-0"
                      style={{ color: "#94a3b8" }}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <span
                      className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
                      style={{ background: "#e2e8f0", color: "#64748b" }}
                    >
                      {displayIdx + 1}
                    </span>
                    <span className="flex-1 text-sm" style={{ color: "#0f172a" }}>
                      {correctOrderItems[correctIdx] || (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                          (Bước {correctIdx + 1})
                        </span>
                      )}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                      style={{ background: "#fdf2f8", color: "#db2777" }}
                    >
                      Đúng: #{correctIdx + 1}
                    </span>
                  </div>
                )}
              </SortableOrderItem>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
