import { X, FileUp, Save, XCircle } from "lucide-react";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Import JSON</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn file JSON
              </label>
              <label className="cursor-pointer inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded border border-gray-300 transition-colors">
                <FileUp className="w-4 h-4" />
                Chọn file
                <input
                  type="file"
                  accept=".json"
                  onChange={onFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">hoặc</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhập JSON trực tiếp
              </label>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                rows={15}
                className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder='{"id": "lessons/example", "summary": "...", "questions": [], "exam": []}'
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            Hủy
          </button>
          <button
            onClick={onImport}
            disabled={!importJsonText.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
