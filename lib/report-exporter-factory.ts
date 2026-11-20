export type ReportFormat = "csv" | "json";
export type ReportRow = Record<string, string | number | null>;

export interface ReportExporter {
  readonly format: ReportFormat;
  readonly mimeType: string;
  export(rows: readonly ReportRow[], columns: readonly string[]): Blob;
}

class CsvReportExporter implements ReportExporter {
  readonly format = "csv" as const;
  readonly mimeType = "text/csv;charset=utf-8";

  export(rows: readonly ReportRow[], columns: readonly string[]): Blob {
    const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      columns.map((column) => cell(column)).join(","),
      ...rows.map((row) => columns.map((column) => cell(row[column])).join(",")),
    ].join("\r\n");

    return new Blob([csv], { type: this.mimeType });
  }
}

class JsonReportExporter implements ReportExporter {
  readonly format = "json" as const;
  readonly mimeType = "application/json;charset=utf-8";

  export(rows: readonly ReportRow[], columns: readonly string[]): Blob {
    const data = rows.map((row) =>
      Object.fromEntries(columns.map((column) => [column, row[column] ?? null])),
    );

    return new Blob([JSON.stringify(data, null, 2)], { type: this.mimeType });
  }
}

/** Creator contract: subclasses choose which ReportExporter product to create. */
export abstract class ReportExporterFactory {
  abstract createExporter(): ReportExporter;
}

export class CsvReportExporterFactory extends ReportExporterFactory {
  createExporter(): ReportExporter {
    return new CsvReportExporter();
  }
}

export class JsonReportExporterFactory extends ReportExporterFactory {
  createExporter(): ReportExporter {
    return new JsonReportExporter();
  }
}

const exporterFactories: Record<ReportFormat, ReportExporterFactory> = {
  csv: new CsvReportExporterFactory(),
  json: new JsonReportExporterFactory(),
};

/** Resolve the Creator abstraction; callers invoke createExporter without naming a product class. */
export function getReportExporterFactory(format: ReportFormat): ReportExporterFactory {
  return exporterFactories[format];
}
