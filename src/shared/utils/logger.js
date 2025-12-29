const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const COLORS = {
  ERROR: '\x1b[31m',   // Rojo
  WARN: '\x1b[33m',    // Amarillo
  INFO: '\x1b[36m',    // Cyan
  DEBUG: '\x1b[90m',   // Gris
  RESET: '\x1b[0m',    // Reset
  BOLD: '\x1b[1m',     // Negrita
};

class Logger {
  constructor(context = 'APP') {
    this.context = context;
    this.level = LOG_LEVELS.DEBUG;
  }

  _formatTimestamp() {
    return new Date().toISOString();
  }

  _formatMessage(level, message, data = null) {
    const timestamp = this._formatTimestamp();
    const color = COLORS[level];
    const reset = COLORS.RESET;
    const bold = COLORS.BOLD;

    let output = `${color}[${timestamp}] [${level}] ${bold}[${this.context}]${reset}${color} ${message}${reset}`;

    if (data !== null) {
      if (typeof data === 'object') {
        output += `\n${color}${JSON.stringify(data, null, 2)}${reset}`;
      } else {
        output += ` ${color}${data}${reset}`;
      }
    }

    return output;
  }

  error(message, data = null) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(this._formatMessage('ERROR', message, data));
    }
  }

  warn(message, data = null) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(this._formatMessage('WARN', message, data));
    }
  }

  info(message, data = null) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(this._formatMessage('INFO', message, data));
    }
  }

  debug(message, data = null) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(this._formatMessage('DEBUG', message, data));
    }
  }

  child(context) {
    return new Logger(`${this.context}:${context}`);
  }
}

// Exportar una instancia por defecto y la clase
const defaultLogger = new Logger();

module.exports = {
  Logger,
  logger: defaultLogger,
};