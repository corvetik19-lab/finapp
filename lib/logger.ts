type LogMetadata = Record<string, unknown>;

type LogLevel = "debug" | "info" | "warn" | "error";

function emit(level: LogLevel, message: string, metadata?: LogMetadata) {
  if (process.env.NODE_ENV !== "production") {
    console[level === "warn" ? "warn" : level](
      `[${level.toUpperCase()}] ${message}`,
      metadata ?? {}
    );
  }

  // TODO: подключить централизованный трекинг (Sentry/Amplitude и т.п.)
  // sendToTelemetry(level, message, metadata);
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
