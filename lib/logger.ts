type LogMetadata = Record<string, unknown> | unknown;

type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = process.env.NODE_ENV !== "production";

function emit(level: LogLevel, message: string, metadata?: LogMetadata) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  // В production логируем только warn и error
  if (!isDev && level !== "warn" && level !== "error") {
    return;
  }

  const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  
  if (metadata && Object.keys(metadata).length > 0) {
    logFn(`${prefix} ${message}`, metadata);
  } else {
    logFn(`${prefix} ${message}`);
  }
}

export const logger = {
  debug(message: string, metadata?: LogMetadata) {
    emit("debug", message, metadata);
  },
  info(message: string, metadata?: LogMetadata) {
    emit("info", message, metadata);
  },
  warn(message: string, metadata?: LogMetadata) {
    emit("warn", message, metadata);
  },
  error(message: string, metadata?: LogMetadata) {
    emit("error", message, metadata);
  },
};
