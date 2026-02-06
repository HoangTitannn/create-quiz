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

  // Lưu items gốc ban đầu để tính correct_order
  const [originalItems] = useState<string[]>(() => {
    if (editingExam?.type === "ordering") {
      return editingExam.items;
    }
    return [""];
  });

  // Sắp xếp items theo correct_order khi edit
  const [orderingItems, setOrderingItems] = useState<string[]>(() => {
    if (editingExam?.type === "ordering") {
      // Sắp xếp items theo correct_order để hiển thị thứ tự đúng
      const sortedItems = editingExam.correct_order.map(idx => editingExam.items[idx]);
      return sortedItems;
    }
    return [""];
  });

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
      // Tính correct_order: tìm index của mỗi item trong orderingItems so với originalItems
      const correct_order = orderingItems.map(item => originalItems.indexOf(item));

      onSubmit({
        ...formData,
        type: examType,
        items: originalItems, // Luôn lưu items theo thứ tự gốc
        correct_order, // Lưu thứ tự đúng
      });
    } else {
      const submitData = { ...formData, type: examType };

      // Fix: Ensure true_false defaults to true if undefined
      if (examType === "true_false" && submitData.answer === undefined) {
        submitData.answer = true;
      }

      onSubmit(submitData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingExam ? "Sửa câu hỏi kiểm tra" : "Thêm câu hỏi kiểm tra"}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ID</label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => editingExam && setFormData((prev: any) => ({ ...prev, id: e.target.value }))}
                readOnly={!editingExam}
                className={`w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md ${!editingExam ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="e1"
                required
              />
              {!editingExam && <p className="text-xs text-gray-500 mt-1">ID tự động gán</p>}
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
          </div>
        </form>

        <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            {editingExam ? "Cập nhật" : "Thêm"}
          </button>
        </div>
      </div>
    </div>
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
            className="flex-1 px-3 py-2 border text-gray-700 border-gray-300 rounded-md"
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
            className="flex-1 px-3 py-2 border text-gray-700 border-gray-300 rounded-md"
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
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Các bước (kéo thả để sắp xếp thứ tự đúng)
      </label>
      <div className="text-xs text-gray-500 mb-3">
        Số thứ tự bên trái là thứ tự đúng. Kéo thả các item để sắp xếp lại thứ tự.
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((_, idx) => idx.toString())} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableItem key={index} id={index.toString()}>
              <div className="flex gap-2 items-center bg-white p-2 rounded border hover:border-blue-300 transition-colors">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-move hover:text-blue-500" />
                <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 font-bold rounded-full text-sm">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
