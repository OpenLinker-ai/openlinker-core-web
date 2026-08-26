import { inputSchemaAllowsProperty } from "./playground-input.mjs";

const maximumProtocolIDLength = 200;

export function playgroundA2AContext(conversationID, turnID, predecessor) {
  const context = {
    protocol_context_id: protocolID(conversationID, "conversationID"),
    root_context_id: protocolID(conversationID, "conversationID"),
    protocol_task_id: protocolID(turnID, "turnID"),
    source: "a2a_protocol",
  };
  if (predecessor === undefined || predecessor === null) return context;
  if (typeof predecessor !== "object" || Array.isArray(predecessor)) {
    throw new TypeError("predecessor is not valid");
  }
  const parentTaskID = protocolID(predecessor.taskID, "predecessor.taskID");
  const parentRunID = runID(predecessor.runID);
  return {
    ...context,
    parent_task_id: parentTaskID,
    parent_run_id: parentRunID,
    reference_task_ids: [parentTaskID],
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

function runID(value) {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new TypeError("predecessor.runID is not a valid Run ID");
  }
  return value;
}

function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
