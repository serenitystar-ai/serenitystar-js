import { ConversationalAgentExecutionOptionsMap } from "../../types";
import { ConversationalAgent } from "./ConversationalAgent";

export class Assistant extends ConversationalAgent<"assistant"> {
  private constructor(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: ConversationalAgentExecutionOptionsMap["assistant"]
  ) {
    super(agentCode, apiKey, baseUrl, options);
  }
  
  static create(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: ConversationalAgentExecutionOptionsMap["assistant"]
  ): Assistant {
    return new Assistant(agentCode, apiKey, baseUrl, options);
  }
}
