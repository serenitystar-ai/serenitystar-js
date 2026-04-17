import { SystemAgent } from "./SystemAgent";
import { ExecuteBodyParams, SystemAgentExecutionOptionsMap } from "../../types";
import { ProxyExecutionOptions } from "./types";
import { AuthProvider } from "../../auth/AuthProvider";

export class Proxy extends SystemAgent<"proxy"> {
  private constructor(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["proxy"]
  ) {
    super(agentCode, authProvider, baseUrl, options);
  }

  static create(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["proxy"]
  ): Proxy {
    return new Proxy(agentCode, authProvider, baseUrl, options);
  }

  static createAndExecute(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["proxy"]
  ) {
    const instance = new Proxy(agentCode, authProvider, baseUrl, options);
    return instance.execute();
  }

  protected createExecuteBody(stream: boolean): ExecuteBodyParams | { [key: string]: any } {
    const options = this.options as ProxyExecutionOptions;
    
    return {
      model: options.model,
      messages: options.messages,
      frequency_penalty: options.frequency_penalty,
      max_tokens: options.max_tokens,
      presence_penalty: options.presence_penalty,
      temperature: options.temperature,
      top_p: options.top_p,
      top_k: options.top_k,
      vendor: options.vendor,
      userIdentifier: options.userIdentifier,
      groupIdentifier: options.groupIdentifier,
      useVision: options.useVision,
      stream: stream,
    }
  }
}
