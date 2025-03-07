import { SystemAgent } from "./SystemAgent";
import { ExecuteBodyParams, SystemAgentExecutionOptionsMap } from "../../types";

export class Plan extends SystemAgent<"plan"> {
  private constructor(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["plan"]
  ) {
    super(agentCode, apiKey, baseUrl, options);
  }

  static create(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["plan"]
  ): Plan {
    return new Plan(agentCode, apiKey, baseUrl, options);
  }

  static createAndExecute(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: SystemAgentExecutionOptionsMap["plan"]
  ) {
    const instance = new Plan(agentCode, apiKey, baseUrl, options);
    return instance.execute();
  }

  protected createExecuteBody(
    stream: boolean
  ): ExecuteBodyParams | { [key: string]: any } {
    const baseOptions = super.createExecuteBody(stream);
    this.appendInputParametersIfNeeded(baseOptions);
    return baseOptions;
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
