import { FileUp, X, Upload } from "lucide-react";

interface ImportDialogProps {
  importJsonText: string;
  setImportJsonText: (text: string) => void;
  onImport: () => void;
  onCancel: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ImportDialog({
  importJsonText,
  setImportJsonText,
  onImport,
  onCancel,
  onFileUpload,
}: ImportDialogProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in"
      style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl w-full max-h-[90vh] flex flex-col animate-scale-in"
        style={{
          maxWidth: "640px",
          boxShadow: "0 24px 64px -8px rgba(15,23,42,0.28), 0 0 0 1px rgba(15,23,42,0.06)",
        }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center px-6 py-5"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#eef2ff" }}
            >
              <FileUp className="w-4 h-4" style={{ color: "#4f46e5" }} />
            </div>
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: "#0f172a", fontFamily: "'Sora', sans-serif" }}
              >
                Import JSON
              </h2>
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                Chọn file hoặc dán JSON trực tiếp
              </p>
            </div>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* File Upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
              Chọn file JSON
            </label>
            <label
              className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl cursor-pointer transition-all duration-150 group"
              style={{
                border: "2px dashed #c7d2fe",
                background: "#f8faff",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLLabelElement).style.borderColor = "#6366f1";
                (e.currentTarget as HTMLLabelElement).style.background = "#eef2ff";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLLabelElement).style.borderColor = "#c7d2fe";
                (e.currentTarget as HTMLLabelElement).style.background = "#f8faff";
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150"
                style={{ background: "#e0e7ff" }}
              >
                <Upload className="w-5 h-5" style={{ color: "#4f46e5" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "#4f46e5" }}>
                  Nhấp để chọn file
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                  Chỉ hỗ trợ file .json
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={onFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ color: "#94a3b8", background: "#f1f5f9" }}>
              hoặc
            </span>
            <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
          </div>

          {/* Text Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
              Dán JSON trực tiếp
            </label>
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all duration-150"
              style={{
                border: "1.5px solid #e2e8f0",
                color: "#0f172a",
                outline: "none",
                fontFamily: "ui-monospace, 'Cascadia Code', monospace",
                fontSize: "12px",
                lineHeight: "1.7",
                background: "#f8fafc",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "#6366f1";
                e.currentTarget.style.background = "#ffffff";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.background = "#f8fafc";
              }}
              placeholder={`{\n  "id": "lessons/example",\n  "summary": "...",\n  "questions": [],\n  "exam": []\n}`}
            />
            {importJsonText && (
              <p className="text-xs mt-1.5 font-medium" style={{ color: "#10b981" }}>
                ✓ {importJsonText.length.toLocaleString()} ký tự
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-6 py-4"
          style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{ background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e2e8f0")}
            onMouseLeave={e => (e.currentTarget.style.background = "#f1f5f9")}
          >
            Hủy
          </button>
          <button
            onClick={onImport}
            disabled={!importJsonText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150"
            style={{
              background: importJsonText.trim()
                ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                : "#e2e8f0",
              color: importJsonText.trim() ? "#ffffff" : "#94a3b8",
              boxShadow: importJsonText.trim() ? "0 2px 8px rgba(99,102,241,0.35)" : "none",
              cursor: importJsonText.trim() ? "pointer" : "not-allowed",
            }}
            onMouseEnter={e => importJsonText.trim() && (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <FileUp className="w-4 h-4" />
            Xác nhận Import
          </button>
        </div>
      </div>
    </div>
  );
}
