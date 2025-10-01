"use client";
import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, FileText, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { authenticatedFetch, UnauthorizedError } from "@/lib/api-client";

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

type ImportContactsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type UploadStatus = "idle" | "parsing" | "uploading" | "success" | "error";

type ImportContactPayload = {
  name: string | null;
  phone: string;
  tags: string[];
};

type ParsedContactsResult = {
  contacts: ImportContactPayload[];
  duplicatePhones: string[];
  skippedWithoutPhone: number;
};

type ImportSummary = {
  total: number;
  imported: number;
  duplicates: {
    inFile: string[];
    existing: string[];
  };
  failures: { phone: string; reason: string }[];
  skippedWithoutPhone: number;
};

const extractTagsFromString = (value: string | undefined) =>
  Array.from(
    new Set(
      (value ?? "")
        .split(/[;,|]/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  );

const extractTagsFromUnknown = (value: unknown) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
          .filter((tag) => tag.length > 0),
      ),
    );
  }

  if (typeof value === "string") {
    return extractTagsFromString(value);
  }

  return [];
};

const normalizePhoneKey = (value: string) =>
  value.replace(/[\s-().]/g, "").toLowerCase();

const parseCsvLine = (line: string) => {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const parseCsvFile = async (file: File): Promise<ParsedContactsResult> => {
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    throw new Error("El archivo CSV está vacío.");
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase(),
  );

  const nameIndex = headers.findIndex((header) =>
    ["name", "nombre"].includes(header),
  );
  const phoneIndex = headers.findIndex((header) =>
    ["phone", "telefono", "teléfono", "celular", "mobile"].includes(header),
  );
  const tagsIndex = headers.findIndex((header) =>
    ["tags", "etiquetas"].includes(header),
  );

  if (phoneIndex === -1) {
    throw new Error(
      "El archivo CSV debe incluir una columna de teléfono (phone o telefono).",
    );
  }

  const seenPhones = new Set<string>();
  const contacts: ImportContactPayload[] = [];
  const duplicatePhones: string[] = [];
  let skippedWithoutPhone = 0;

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    const cells = parseCsvLine(line);
    const phone = cells[phoneIndex]?.trim() ?? "";

    if (!phone) {
      skippedWithoutPhone += 1;
      continue;
    }

    const normalizedPhone = normalizePhoneKey(phone);

    if (!normalizedPhone) {
      skippedWithoutPhone += 1;
      continue;
    }

    if (seenPhones.has(normalizedPhone)) {
      duplicatePhones.push(phone);
      continue;
    }

    seenPhones.add(normalizedPhone);

    const nameValue = nameIndex >= 0 ? (cells[nameIndex]?.trim() ?? "") : "";
    const tagsValue = tagsIndex >= 0 ? (cells[tagsIndex] ?? "") : "";

    contacts.push({
      name: nameValue.length ? nameValue : null,
      phone,
      tags: extractTagsFromString(tagsValue),
    });
  }

  return { contacts, duplicatePhones, skippedWithoutPhone };
};

const parseJsonFile = async (file: File): Promise<ParsedContactsResult> => {
  const text = await file.text();

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("No pudimos leer el archivo JSON. Revisa el formato.");
  }

  const entries: unknown[] | null = Array.isArray(payload)
    ? payload
    : typeof payload === "object" &&
        payload !== null &&
        Array.isArray((payload as { contacts?: unknown }).contacts)
      ? (payload as { contacts: unknown[] }).contacts
      : null;

  if (!entries) {
    throw new Error(
      "El JSON debe ser un array de contactos o incluir la propiedad `contacts`.",
    );
  }

  const seenPhones = new Set<string>();
  const contacts: ImportContactPayload[] = [];
  const duplicatePhones: string[] = [];
  let skippedWithoutPhone = 0;

  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      skippedWithoutPhone += 1;
      continue;
    }

    const candidate = entry as {
      name?: unknown;
      phone?: unknown;
      tags?: unknown;
    };

    const phone =
      typeof candidate.phone === "string" ? candidate.phone.trim() : "";

    if (!phone) {
      skippedWithoutPhone += 1;
      continue;
    }

    const normalizedPhone = normalizePhoneKey(phone);

    if (!normalizedPhone) {
      skippedWithoutPhone += 1;
      continue;
    }

    if (seenPhones.has(normalizedPhone)) {
      duplicatePhones.push(phone);
      continue;
    }

    seenPhones.add(normalizedPhone);

    const name =
      typeof candidate.name === "string" && candidate.name.trim().length
        ? candidate.name.trim()
        : null;

    contacts.push({
      name,
      phone,
      tags: extractTagsFromUnknown(candidate.tags),
    });
  }

  return { contacts, duplicatePhones, skippedWithoutPhone };
};

const parseContactsFile = async (file: File): Promise<ParsedContactsResult> => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "json" || file.type === "application/json") {
    return parseJsonFile(file);
  }

  if (extension === "csv" || file.type === "text/csv") {
    return parseCsvFile(file);
  }

  throw new Error("Formato no soportado. Usa archivos CSV o JSON.");
};

const ImportContactsModal = ({ isOpen, onClose }: ImportContactsModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setUploadStatus("idle");
      setErrorMessage(null);
      setSummary(null);
    }
  }, []);

  const isBusy = useMemo(
    () => uploadStatus === "parsing" || uploadStatus === "uploading",
    [uploadStatus],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
    },
    maxFiles: 1,
    disabled: isBusy,
  });

  const handleImport = async () => {
    if (!file) {
      return;
    }

    setUploadStatus("parsing");
    setErrorMessage(null);

    let parsedFile: ParsedContactsResult;

    try {
      parsedFile = await parseContactsFile(file);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No pudimos procesar el archivo seleccionado.";
      setUploadStatus("error");
      setErrorMessage(message);
      return;
    }

    if (!parsedFile.contacts.length) {
      setUploadStatus("error");
      setErrorMessage(
        "No encontramos contactos válidos. Revisa que cada fila tenga un teléfono.",
      );
      return;
    }

    setUploadStatus("uploading");

    try {
      const response = await authenticatedFetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: parsedFile.contacts,
        }),
      });

      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ error: "No pudimos importar los contactos." }));
        throw new Error(
          typeof message?.error === "string"
            ? message.error
            : "No pudimos importar los contactos.",
        );
      }

      const data = (await response.json()) as {
        total: number;
        imported: number;
        duplicates: { inFile: string[]; existing: string[] };
        failures: { phone: string; reason: string }[];
      };

      const result: ImportSummary = {
        total: data.total,
        imported: data.imported,
        duplicates: {
          inFile: Array.from(
            new Set([...parsedFile.duplicatePhones, ...data.duplicates.inFile]),
          ),
          existing: data.duplicates.existing,
        },
        failures: data.failures,
        skippedWithoutPhone: parsedFile.skippedWithoutPhone,
      };

      setSummary(result);
      setUploadStatus("success");

      if (result.imported > 0) {
        toast.success(
          `${result.imported} contacto${result.imported === 1 ? "" : "s"} importado${
            result.imported === 1 ? "" : "s"
          } correctamente`,
        );
        window.dispatchEvent(new CustomEvent("contacts:updated"));
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        setErrorMessage(error.message);
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al importar los contactos.";
        setErrorMessage(message);
      }
      setUploadStatus("error");
    }
  };

  const handleClose = () => {
    setFile(null);
    setUploadStatus("idle");
    setErrorMessage(null);
    setSummary(null);
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
          <motion.div //@ts-expect-error bla
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
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } ${
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
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setSummary(null);
                      setErrorMessage(null);
                    }}
                    className="p-1 rounded-full text-gray-400 hover:bg-gray-200"
                    disabled={isBusy}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              {errorMessage && (
                <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
              {summary && (
                <div className="mt-6 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4 text-left text-sm text-gray-700">
                  <p className="text-base font-semibold text-gray-800">
                    Resumen de la importación
                  </p>
                  <ul className="space-y-1">
                    <li>
                      <span className="font-medium text-gray-900">
                        Total procesado:
                      </span>{" "}
                      {summary.total}
                    </li>
                    <li>
                      <span className="font-medium text-gray-900">
                        Importados correctamente:
                      </span>{" "}
                      {summary.imported}
                    </li>
                    {summary.skippedWithoutPhone > 0 && (
                      <li>
                        <span className="font-medium text-gray-900">
                          Filas sin teléfono:
                        </span>{" "}
                        {summary.skippedWithoutPhone}
                      </li>
                    )}
                    {summary.duplicates.inFile.length > 0 && (
                      <li>
                        <span className="font-medium text-gray-900">
                          Duplicados en el archivo:
                        </span>{" "}
                        {summary.duplicates.inFile.join(", ")}
                      </li>
                    )}
                    {summary.duplicates.existing.length > 0 && (
                      <li>
                        <span className="font-medium text-gray-900">
                          Duplicados ya existentes:
                        </span>{" "}
                        {summary.duplicates.existing.join(", ")}
                      </li>
                    )}
                    {summary.failures.length > 0 && (
                      <li>
                        <span className="font-medium text-gray-900">
                          Errores:
                        </span>{" "}
                        {summary.failures
                          .map((failure) => failure.phone)
                          .join(", ")}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                disabled={isBusy}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleImport();
                }}
                disabled={!file || isBusy}
                className="px-4 py-2 bg-[#8694ff] text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploadStatus === "idle" && "Importar"}
                {uploadStatus === "parsing" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Preparando
                  </>
                )}
                {uploadStatus === "uploading" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importando
                  </>
                )}
                {uploadStatus === "success" && (
                  <CheckCircle className="h-5 w-5" />
                )}
                {uploadStatus === "error" && !isBusy && "Reintentar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImportContactsModal;
