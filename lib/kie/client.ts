/**
 * Kie.ai API Client
 */

import { 
  KIE_API_BASE_URL, 
  KIE_ENDPOINTS, 
  KIE_TASK_STATES,
  POLLING_INTERVALS,
  KIE_FILE_UPLOAD_BASE_URL,
  KIE_FILE_UPLOAD_ENDPOINTS,
} from "./constants";
import { 
  KieApiResponse, 
  KieCreateTaskRequest, 
  KieCreateTaskResponse, 
  KieTaskStatusData,
  KieTaskResult,
} from "./types";

class KieClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) {
      throw new Error("KIE_API_KEY environment variable is not set");
    }
    this.apiKey = apiKey;
    this.baseUrl = KIE_API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<KieApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kie API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data as KieApiResponse<T>;
  }

  /**
   * Create a new generation task
   */
  async createTask(
    model: string,
    input: Record<string, unknown>,
    callbackUrl?: string
  ): Promise<KieCreateTaskResponse> {
    const body: KieCreateTaskRequest = {
      model,
      input,
    };

    if (callbackUrl) {
      body.callBackUrl = callbackUrl;
    }

    const response = await this.request<KieCreateTaskResponse>(
      KIE_ENDPOINTS.CREATE_TASK,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    if (response.code !== 200) {
      throw new Error(`Failed to create task: ${response.msg || response.message}`);
    }

    return response.data;
  }

  /**
   * Get task status and results
   */
  async getTaskStatus(taskId: string): Promise<KieTaskStatusData> {
    const response = await this.request<KieTaskStatusData>(
      `${KIE_ENDPOINTS.GET_TASK_STATUS}?taskId=${encodeURIComponent(taskId)}`,
      {
        method: "GET",
      }
    );

    if (response.code !== 200) {
      throw new Error(`Failed to get task status: ${response.msg || response.message}`);
    }

    return response.data;
  }

  /**
   * Parse result JSON from task status
   */
  parseTaskResult(resultJson: string): KieTaskResult | null {
    if (!resultJson) return null;
    
    try {
      return JSON.parse(resultJson) as KieTaskResult;
    } catch {
      console.error("Failed to parse task result JSON:", resultJson);
      return null;
    }
  }

  /**
   * Wait for task completion with polling
   */
  async waitForTask(
    taskId: string,
    onProgress?: (status: KieTaskStatusData) => void,
    maxDuration: number = POLLING_INTERVALS.MAX_DURATION
  ): Promise<KieTaskStatusData> {
    const startTime = Date.now();
    let pollInterval: number = POLLING_INTERVALS.INITIAL;

    while (Date.now() - startTime < maxDuration) {
      const status = await this.getTaskStatus(taskId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.state === KIE_TASK_STATES.SUCCESS) {
        return status;
      }

      if (status.state === KIE_TASK_STATES.FAIL) {
        throw new Error(`Task failed: ${status.failMsg || "Unknown error"}`);
      }

      // Adjust polling interval based on elapsed time
      const elapsed = Date.now() - startTime;
      if (elapsed > 120000) {
        pollInterval = POLLING_INTERVALS.LONG;
      } else if (elapsed > 30000) {
        pollInterval = POLLING_INTERVALS.MEDIUM;
      }

      await this.sleep(pollInterval);
    }

    throw new Error(`Task timeout after ${maxDuration / 1000} seconds`);
  }

  /**
   * Check if task is still processing
   */
  isTaskProcessing(state: string): boolean {
    const processingStates: string[] = [
      KIE_TASK_STATES.WAITING,
      KIE_TASK_STATES.QUEUING,
      KIE_TASK_STATES.GENERATING,
    ];
    return processingStates.includes(state);
  }

  /**
   * Check if task completed successfully
   */
  isTaskSuccess(state: string): boolean {
    return state === KIE_TASK_STATES.SUCCESS;
  }

  /**
   * Check if task failed
   */
  isTaskFailed(state: string): boolean {
    return state === KIE_TASK_STATES.FAIL;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get account credits balance
   */
  async getCredits(): Promise<number> {
    const response = await this.request<number>(
      KIE_ENDPOINTS.GET_CREDITS,
      { method: "GET" }
    );

    if (response.code !== 200) {
      throw new Error(`Failed to get credits: ${response.msg || response.message}`);
    }

    return response.data;
  }

  /**
   * Upload file to Kie.ai via File Stream Upload
   * Returns the file URL to use in generation tasks
   */
  async uploadFile(file: File, uploadPath: string = "uploads"): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploadPath", uploadPath);
    formData.append("fileName", `${Date.now()}-${file.name}`);

    const url = `${KIE_FILE_UPLOAD_BASE_URL}${KIE_FILE_UPLOAD_ENDPOINTS.FILE_STREAM}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`File upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.code !== 200 || !data.success) {
      throw new Error(`File upload failed: ${data.msg || "Unknown error"}`);
    }

    return data.data.fileUrl;
  }

  /**
   * Upload file from base64 string
   */
  async uploadBase64(base64Data: string, fileName: string, uploadPath: string = "uploads"): Promise<string> {
    const url = `${KIE_FILE_UPLOAD_BASE_URL}${KIE_FILE_UPLOAD_ENDPOINTS.FILE_BASE64}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Data,
        uploadPath,
        fileName: `${Date.now()}-${fileName}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Base64 upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.code !== 200 || !data.success) {
      throw new Error(`Base64 upload failed: ${data.msg || "Unknown error"}`);
    }

    return data.data.fileUrl;
  }
}

// Singleton instance
let _client: KieClient | null = null;

export function getKieClient(): KieClient {
  if (!_client) {
    _client = new KieClient();
  }
  return _client;
}

export { KieClient };
