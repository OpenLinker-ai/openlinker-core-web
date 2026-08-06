import { inputSchemaAllowsProperty } from "./playground-input.mjs";

const maximumProtocolIDLength = 200;

export function playgroundA2AContext(conversationID, turnID) {
  return {
    protocol_context_id: protocolID(conversationID, "conversationID"),
    root_context_id: protocolID(conversationID, "conversationID"),
    protocol_task_id: protocolID(turnID, "turnID"),
    source: "a2a_protocol",
  };
}

export function playgroundRunInput(input, history, taskBacked, inputSchema) {
  if (!taskBacked || history.length === 0) return input;
  if (!inputSchemaAllowsProperty(inputSchema, "conversation_history")) return input;
  if (isPlainRecord(input)) {
    if ("conversation_history" in input || "messages" in input) return input;
    return { ...input, conversation_history: history };
  }
  return { input, conversation_history: history };
}

function protocolID(value, label) {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length === 0 ||
    value.length > maximumProtocolIDLength
  ) {
    throw new TypeError(`${label} is not a valid protocol ID`);
  }
  return value;
}

function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
