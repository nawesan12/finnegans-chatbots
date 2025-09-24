"use client";
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, FileText, CheckCircle } from "lucide-react";

const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalContentVariants = {
  hidden: { y: "-50%", opacity: 0, scale: 0.9 },
  visible: {
    y: "0%",
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: { y: "50%", opacity: 0, scale: 0.9 },
};

const ImportContactsModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [file, setFile] = useState();
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle, uploading, success, error

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      //@ts-expect-error it exists
      setFile(acceptedFiles[0]);
      setUploadStatus("idle");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
    },
    maxFiles: 1,
  });

  const handleImport = () => {
    if (!file) return;
    setUploadStatus("uploading");
    // Simulate upload process
    setTimeout(() => {
      // Here you would typically parse the file and add contacts
      //@ts-expect-error it exists
      console.log("Importing file:", file?.name);
      setUploadStatus("success");
      window.dispatchEvent(new CustomEvent("contacts:updated"));
      setTimeout(() => {
        handleClose();
      }, 1500);
    }, 2000);
  };

  const handleClose = () => {
    //@ts-expect-error it exists
    setFile(null);
    setUploadStatus("idle");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleClose}
        >
          <motion.div //@ts-expect-error it exists
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Importar Contactos
                </h2>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-gray-500 mb-6">
                Subi un CSV o un JSON para importar contactos en masa.
              </p>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-300 hover:border-indigo-500"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center text-gray-500">
                  <UploadCloud className="h-12 w-12 mb-3" />
                  {isDragActive ? (
                    <p className="font-semibold text-indigo-600">
                      Soltar el archivo aquí...
                    </p>
                  ) : (
                    <>
                      <p className="font-semibold">
                        Arrastra y suelta un archivo aquí, o haz clic para
                        seleccionar
                      </p>
                      <p className="text-sm mt-1">
                        Formatos admitidos: CSV, JSON
                      </p>
                    </>
                  )}
                </div>
              </div>

              {file && (
                <div className="mt-6 bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-6 w-6 text-gray-500 mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">
                        {
                          //@ts-expect-error it exists
                          file?.name
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        {
                          //@ts-expect-error it exists
                          (file.size / 1024).toFixed(2)
                        }{" "}
                        KB
                      </p>
                    </div>
                  </div>
                  <button //@ts-expect-error it exists
                    onClick={() => setFile(null)}
                    className="p-1 rounded-full text-gray-400 hover:bg-gray-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || uploadStatus !== "idle"}
                className="px-4 py-2 bg-[#8694ff] text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center w-32"
              >
                {uploadStatus === "idle" && "Import"}
                {uploadStatus === "uploading" && (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {uploadStatus === "success" && (
                  <CheckCircle className="h-5 w-5" />
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImportContactsModal;
