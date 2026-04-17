import { ExecuteBodyParams } from "../../types";
import { SystemAgentExecutionOptionsMap } from "./../../types";
import { SystemAgent } from "./SystemAgent";
import { AuthProvider } from "../../auth/AuthProvider";

export class ChatCompletion extends SystemAgent<"chat-completion"> {
  private constructor(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["chat-completion"]
  ) {
    super(agentCode, authProvider, baseUrl, options);
  }

  static create(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["chat-completion"]
  ): ChatCompletion {
    return new ChatCompletion(agentCode, authProvider, baseUrl, options);
  }

  static createAndExecute(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["chat-completion"]
  ) {
    const instance = new ChatCompletion(agentCode, authProvider, baseUrl, options);
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
