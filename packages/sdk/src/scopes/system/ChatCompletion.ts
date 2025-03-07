import { ExecuteBodyParams } from "../../types";
import { SystemAgentExecutionOptionsMap } from "./../../types";
import { SystemAgent } from "./SystemAgent";

export class ChatCompletion extends SystemAgent<"chat-completion"> {
  private constructor(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["chat-completion"]
  ) {
    super(agentCode, apiKey, baseUrl, options);
  }

  static create(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["chat-completion"]
  ): ChatCompletion {
    return new ChatCompletion(agentCode, apiKey, baseUrl, options);
  }

  static createAndExecute(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["chat-completion"]
  ) {
    const instance = new ChatCompletion(agentCode, apiKey, baseUrl, options);
    return instance.execute();
  }

  protected createExecuteBody(stream: boolean): ExecuteBodyParams | { [key: string]: any } {
    const body = super.createExecuteBody(stream);

    this.appendMessagesIfNeeded(body);
    this.appendMessageIfNeeded(body);
    this.appendInputParametersIfNeeded(body);

    return body;
  }

  private appendMessagesIfNeeded(body: ExecuteBodyParams | { [key: string]: any }) {
    if (!this.options?.messages || this.options.messages.length === 0) return;

    body.push({
      Key: "messages",
      Value: JSON.stringify(this.options.messages),
    });
  }

  private appendMessageIfNeeded(body: ExecuteBodyParams | { [key: string]: any }) {
    if (!this.options?.message) return;

    body.push({
      Key: "message",
      Value: this.options.message,
    });
  }

  private appendInputParametersIfNeeded(
    body: ExecuteBodyParams | { [key: string]: any }
  ) {
    if (
      !this.options?.inputParameters ||
      Object.keys(this.options.inputParameters).length === 0
    )
      return;

    for (const [key, value] of Object.entries(this.options.inputParameters)) {
      body.push({
        Key: key,
        Value: value,
      });
    }
  }
}
