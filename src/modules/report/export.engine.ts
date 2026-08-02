import { format, FormatterOptionsArgs } from 'fast-csv';
import { Transform, pipeline, Readable, Writable } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

export class ExportEngine {
  /**
   * Streams data from a readable source, formats it as CSV, and writes it to a writable destination.
   * Uses fast-csv for highly efficient streaming, minimizing memory overhead.
   */
  public static async streamToCsv(
    sourceStream: Readable,
    destinationStream: Writable,
    options: FormatterOptionsArgs<any, any> = { headers: true }
  ): Promise<void> {
    const csvStream = format(options);
    
    // Pipe source -> csv formatter -> destination
    await pipelineAsync(sourceStream, csvStream, destinationStream);
  }

  /**
   * Streams data from a readable source, formats it as a JSON array, and writes it to a writable destination.
   */
  public static async streamToJson(
    sourceStream: Readable,
    destinationStream: Writable
  ): Promise<void> {
    let isFirst = true;

    const jsonTransform = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          const jsonString = JSON.stringify(chunk);
          if (isFirst) {
            isFirst = false;
            this.push(`[${jsonString}`);
          } else {
            this.push(`,${jsonString}`);
          }
          callback();
        } catch (err) {
          callback(err as Error);
        }
      },
      flush(callback) {
        if (isFirst) {
          this.push('[]');
        } else {
          this.push(']');
        }
        callback();
      }
    });

    await pipelineAsync(sourceStream, jsonTransform, destinationStream);
  }
}
