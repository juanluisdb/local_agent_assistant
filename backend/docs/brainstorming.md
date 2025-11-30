# Agent System Architecture Specification

## 1. Overview

This document describes the architecture for a local LLM agent system with streaming capabilities, human-in-the-loop approvals, and conversation management.

**Key Features:**
- Real-time streaming of agent execution via Server-Sent Events (SSE)
- Human approval for sensitive operations (code execution, file access)
- Conversation management with edit capability
- Checkpoint-based state persistence
- Cancellation support

**Tech Stack:**
- Backend: Python, FastAPI, litellm
- Transport: SSE (Server-Sent Events) for streaming, HTTP POST for control
- Storage: File-based initially (easily upgradeable to PostgreSQL)

---

## 2. Data Contracts

### 2.1 Core Data Models

```python
from pydantic import BaseModel
from enum import StrEnum
from litellm.types.utils import Message

class EventType(StrEnum):
    TOOL_CALL = "TOOL_CALL"
    TOOL_RESULT = "TOOL_RESULT"
    THINKING = "THINKING"
    ANSWER = "ANSWER"

class ToolCallEvent(BaseModel):
    type: EventType = EventType.TOOL_CALL
    id: str
    tool_name: str
    tool_input: str

class ToolResultEvent(BaseModel):
    type: EventType = EventType.TOOL_RESULT
    id: str
    tool_name: str
    tool_output: str

class ThinkingEvent(BaseModel):
    type: EventType = EventType.THINKING
    content: str

class AnswerEvent(BaseModel):
    type: EventType = EventType.ANSWER
    content: str

AgentEvent = ToolCallEvent | ToolResultEvent | ThinkingEvent | AnswerEvent

class AgentState(BaseModel):
    messages: list[Message]

class InteractionStatus(StrEnum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    WAITING_APPROVAL = "WAITING_APPROVAL"

class Interaction(BaseModel):
    id: str
    status: InteractionStatus
    user_message: str
    agent_events: list[AgentEvent]
    final_agent_state: AgentState | None  # None while running
    created_at: str  # ISO 8601
    completed_at: str | None

class Chat(BaseModel):
    id: str
    interactions: list[Interaction]
    created_at: str
```

### 2.2 SSE Event Format

All SSE events follow this structure:

```
event: <event_type>
data: <json_payload>

```

**Event Types:**
- `interaction_started` - Interaction begins
- `tool_call` - Agent wants to call a tool
- `tool_result` - Tool execution result
- `thinking` - Agent reasoning/planning
- `answer` - Final answer to user
- `approval_required` - Human approval needed
- `approved` - Action was approved
- `rejected` - Action was rejected
- `cancelled` - Interaction was cancelled
- `error` - Error occurred
- `interaction_complete` - Interaction finished

**Example:**
```
event: tool_call
data: {"type": "TOOL_CALL", "id": "call_123", "tool_name": "search", "tool_input": "{\"query\": \"weather\"}"}

event: thinking
data: {"type": "THINKING", "content": "Let me analyze the search results..."}

event: answer
data: {"type": "ANSWER", "content": "The weather today is sunny, 72°F."}

event: interaction_complete
data: {"interaction_id": "int_abc123", "status": "COMPLETED"}
```

---

## 3. API Endpoints

### 3.1 Start New Interaction (Streaming)

**Endpoint:** `POST /chats/{chat_id}/interactions`

**Description:** Starts a new interaction and streams agent events in real-time.

**Request Body:**
```json
{
  "user_message": "What's the weather in Barcelona?"
}
```

**Response:** SSE stream (`Content-Type: text/event-stream`)

**Headers:**
```
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Flow:**
1. Create new Interaction with status `RUNNING`
2. Stream events as agent executes
3. If approval needed, emit `approval_required` event and WAIT
4. Continue streaming after approval/rejection
5. Emit `interaction_complete` when done
6. Save final state to storage

**Example:**
```bash
curl -N -X POST http://localhost:8000/chats/chat_123/interactions \
  -H "Content-Type: application/json" \
  -d '{"user_message": "Search for latest AI news"}'
```

---

### 3.2 Approve Action

**Endpoint:** `POST /chats/{chat_id}/interactions/{interaction_id}/approve`

**Description:** Approves a pending action (unblocks the waiting agent).

**Request Body:**
```json
{
  "approval_id": "approval_abc123",
  "approved": true  // or false to reject
}
```

**Response:**
```json
{
  "status": "processed",
  "approval_id": "approval_abc123",
  "approved": true
}
```

**Flow:**
1. Lookup pending approval by `approval_id`
2. Signal the waiting agent (via asyncio.Event)
3. Agent resumes execution and continues streaming
4. Return immediately

**Error Cases:**
- 404 if approval_id not found
- 400 if approval already processed

---

### 3.3 Cancel Interaction

**Endpoint:** `POST /chats/{chat_id}/interactions/{interaction_id}/cancel`

**Description:** Cancels a running interaction.

**Response:**
```json
{
  "status": "cancelling",
  "interaction_id": "int_abc123",
  "message": "Interaction will stop at next checkpoint"
}
```

**Flow:**
1. Signal cancellation event for the interaction
2. Agent checks cancellation flag periodically
3. Agent emits `cancelled` event
4. Agent saves checkpoint with status `CANCELLED`
5. Stream closes

---

### 3.4 Get Chat History

**Endpoint:** `GET /chats/{chat_id}`

**Description:** Retrieves full chat with all interactions.

**Response:**
```json
{
  "id": "chat_123",
  "interactions": [
    {
      "id": "int_001",
      "status": "COMPLETED",
      "user_message": "Hello",
      "agent_events": [...],
      "final_agent_state": {...},
      "created_at": "2025-01-15T10:00:00Z",
      "completed_at": "2025-01-15T10:00:05Z"
    }
  ],
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### 3.5 Resume from Edit

**Endpoint:** `POST /chats/{chat_id}/interactions/{interaction_id}/edit`

**Description:** Edits a previous user message and re-runs from that point.

**Request Body:**
```json
{
  "new_user_message": "Actually, show me weather in Madrid"
}
```

**Response:** SSE stream (same as 3.1)

**Flow:**
1. Find the interaction to edit
2. Load `final_agent_state` from PREVIOUS interaction (or initial state if first)
3. Mark current interaction and all following as deleted/superseded
4. Create new interaction with edited message
5. Run agent from restored state
6. Stream events as normal

---

## 4. Architecture Patterns

### 4.1 SSE vs WebSockets Decision

**Choice: SSE with separate HTTP endpoints for control**

**Rationale:**
- ✅ Simpler than WebSockets (just HTTP)
- ✅ Works with all standard HTTP tools (curl, load balancers, CDNs)
- ✅ Easy to test and debug
- ✅ Separate control endpoints are RESTful
- ✅ Client disconnection = standard HTTP

**Trade-off:**
- Control actions (approve, cancel) require separate HTTP requests
- ~100-200ms latency for control signals (acceptable)

---

### 4.2 Approval Pattern (Human-in-the-Loop)

**Problem:** Agent needs to wait for human approval before executing dangerous operations.

**Solution:** Block the agent using `asyncio.Event`, unblock via separate HTTP endpoint.

```python
class ApprovalManager:
    def __init__(self):
        self.pending: dict[str, asyncio.Event] = {}
        self.results: dict[str, bool] = {}
    
    async def request_approval(self, approval_id: str) -> bool:
        """Blocks until approval received"""
        event = asyncio.Event()
        self.pending[approval_id] = event
        
        await event.wait()  # BLOCKS HERE
        
        result = self.results.pop(approval_id)
        self.pending.pop(approval_id)
        return result
    
    def respond(self, approval_id: str, approved: bool):
        """Called from HTTP endpoint to unblock"""
        self.results[approval_id] = approved
        self.pending[approval_id].set()  # UNBLOCKS
```

**Flow:**
```
Agent Thread                    HTTP Endpoint Thread
    |                                  |
    |-- Need approval                  |
    |-- Emit approval_required event   |
    |-- await approval                 |
    |   (BLOCKED)                      |
    |                                  |
    |                           POST /approve
    |                           respond(id, True)
    |                                  |
    |<-- UNBLOCKED -------------------|
    |-- Continue execution             |
```

**Key Insight:** `await event.wait()` suspends the coroutine WITHOUT blocking the event loop. Other requests continue processing.

---

### 4.3 Cancellation Pattern

**Problem:** Client disconnects or explicitly cancels → agent should stop gracefully.

**Solution:** Cooperative cancellation with checkpoint on exit.

```python
class Agent:
    def __init__(self):
        self.cancel_event = asyncio.Event()
    
    async def run(self, user_message: str):
        try:
            for step in self.steps:
                # Check cancellation before each step
                if self.cancel_event.is_set():
                    yield CancelledEvent()
                    return
                
                # Do work
                result = await step.execute()
                yield result
        
        except asyncio.CancelledError:
            # Client disconnected
            logger.info("Client disconnected")
            raise
        
        finally:
            # CRITICAL: Always save checkpoint
            await asyncio.shield(self.save_checkpoint())
```

**Critical:** Use `asyncio.shield()` to ensure checkpoint completes even if task is cancelled.

```python
finally:
    # Protected from cancellation
    await asyncio.shield(save_checkpoint(interaction_id, state))
```

---

### 4.4 Checkpoint Strategy

**Design Decision:** One checkpoint per interaction (at the end).

**Rationale:**
- Simple: Only checkpoint at interaction boundaries
- Efficient: Don't checkpoint during execution
- Sufficient: If interaction fails, restart it (idempotent tools)

**Structure:**
```
chats/
  chat_abc123/
    chat.json              # Chat metadata
    interactions/
      int_001.json         # Interaction 1 + final_agent_state
      int_002.json         # Interaction 2 + final_agent_state
      int_003.json         # Interaction 3 + final_agent_state
```

**Each interaction file contains:**
```json
{
  "id": "int_001",
  "status": "COMPLETED",
  "user_message": "Hello",
  "agent_events": [...],
  "final_agent_state": {
    "messages": [...]
  },
  "created_at": "...",
  "completed_at": "..."
}
```

**Resume Logic:**
1. Load interaction N-1
2. Extract `final_agent_state`
3. Use this as starting state for interaction N

---

### 4.5 Storage Interface

```python
class InteractionStore(ABC):
    @abstractmethod
    async def save_interaction(self, chat_id: str, interaction: Interaction):
        """Save interaction + final state"""
        pass
    
    @abstractmethod
    async def load_interaction(self, chat_id: str, interaction_id: str) -> Interaction:
        """Load specific interaction"""
        pass
    
    @abstractmethod
    async def load_chat(self, chat_id: str) -> Chat:
        """Load entire chat history"""
        pass
    
    @abstractmethod
    async def get_previous_state(self, chat_id: str, interaction_id: str) -> AgentState | None:
        """Get state before this interaction (for edit/resume)"""
        pass
```

**Implementation: FileInteractionStore**
- Start with JSON files (simple, no dependencies)
- Easy to migrate to PostgreSQL later (same interface)
- One file per interaction for easy inspection/debugging

---

## 5. Agent Execution Flow

### 5.1 Standard Flow (No Approval)

```
Client                     Server                      Agent
  |                          |                           |
  |--POST /interactions----->|                           |
  |                          |--create interaction------>|
  |                          |                           |
  |<-event: interaction_started-------------------------|
  |                          |                           |
  |<-event: thinking----------------------------------------|
  |<-event: tool_call---------------------------------------|
  |                          |                           |
  |                          |<--execute tool------------|
  |                          |                           |
  |<-event: tool_result-------------------------------------|
  |<-event: thinking----------------------------------------|
  |<-event: answer------------------------------------------|
  |<-event: interaction_complete----------------------------|
  |                          |                           |
  |                          |<--save checkpoint---------|
```

### 5.2 Flow with Approval

```
Client                     Server                      Agent
  |                          |                           |
  |--POST /interactions----->|                           |
  |                          |                           |
  |<-event: thinking----------------------------------------|
  |<-event: approval_required-------------------------------|
  |                          |                           |
  |                          |   (agent BLOCKED waiting) |
  |                          |                           |
  | [User reviews action]    |                           |
  |                          |                           |
  |--POST /approve---------->|                           |
  |                          |--signal approval--------->|
  |                          |                           |
  |<-event: approved----------------------------------------|
  |<-event: tool_call---------------------------------------|
  |<-event: tool_result-------------------------------------|
  |<-event: answer------------------------------------------|
  |<-event: interaction_complete----------------------------|
```

### 5.3 Flow with Cancellation

```
Client                     Server                      Agent
  |                          |                           |
  |--POST /interactions----->|                           |
  |<-event: thinking----------------------------------------|
  |                          |                           |
  | [User clicks cancel]     |                           |
  |                          |                           |
  |--POST /cancel----------->|                           |
  |                          |--set cancel flag--------->|
  |                          |                           |
  |                          |   (agent checks flag)     |
  |                          |                           |
  |<-event: cancelled---------------------------------------|
  |<-event: interaction_complete----------------------------|
  |                          |                           |
  |                          |<--save checkpoint---------|
```

### 5.4 Edit Flow

```
Client                     Server                      Agent
  |                          |                           |
  |--POST /edit------------->|                           |
  |                          |--load previous state----->|
  |                          |--mark interactions as deleted
  |                          |                           |
  |<-event: interaction_started (NEW)---------------------|
  |<-event: thinking----------------------------------------|
  |<-event: answer------------------------------------------|
  |<-event: interaction_complete----------------------------|
```

---

## 6. Key Async Patterns

### 6.1 Blocking for Approval

```python
async def agent_execution():
    # Need approval for dangerous operation
    approval_id = f"approval_{uuid.uuid4()}"
    
    yield ApprovalRequiredEvent(approval_id=approval_id, action="execute_code")
    
    # BLOCK until approval
    approved = await approval_manager.request_approval(approval_id)
    
    if not approved:
        yield RejectedEvent()
        return
    
    # Continue execution
    result = await execute_dangerous_operation()
    yield ToolResultEvent(result=result)
```

### 6.2 Graceful Cancellation

```python
async def agent_execution():
    try:
        for step in steps:
            # Check cancellation BEFORE each step
            if cancel_event.is_set():
                yield CancelledEvent()
                return
            
            result = await step.execute()
            yield result
    
    except asyncio.CancelledError:
        # Client disconnected
        yield CancelledEvent()
        raise
    
    finally:
        # ALWAYS save checkpoint (even on cancellation)
        await asyncio.shield(save_checkpoint())
```

### 6.3 Protected Cleanup

```python
async def stream_interaction():
    try:
        async for event in agent.run(message):
            yield format_sse(event)
    
    except asyncio.CancelledError:
        logger.info("Stream cancelled")
        raise
    
    finally:
        # Shield ensures this completes even if cancelled
        try:
            await asyncio.shield(
                asyncio.wait_for(
                    save_interaction(interaction),
                    timeout=5.0
                )
            )
        except asyncio.TimeoutError:
            # Fallback: save to local file
            save_to_disk(interaction)
        except Exception as e:
            logger.error(f"Failed to save: {e}")
```

---

## 7. Error Handling

### 7.1 Tool Execution Errors

**Strategy:** Catch errors, emit error event, let agent decide what to do.

```python
async def execute_tool(tool_call):
    try:
        result = await tool.execute(tool_call.input)
        return ToolResultEvent(result=result)
    except Exception as e:
        # Return error as tool result
        return ToolResultEvent(
            result=f"Error executing tool: {str(e)}"
        )
        # Let agent see the error and decide how to handle
```

### 7.2 Agent Execution Errors

**Strategy:** Emit error event, save checkpoint with FAILED status.

```python
async def run_interaction():
    try:
        async for event in agent.run():
            yield event
    except Exception as e:
        yield ErrorEvent(error=str(e))
        interaction.status = InteractionStatus.FAILED
        await save_interaction(interaction)
```

### 7.3 Checkpoint Save Errors

**Strategy:** Shield + timeout + fallback to local disk.

```python
finally:
    try:
        await asyncio.wait_for(
            asyncio.shield(save_to_db(interaction)),
            timeout=5.0
        )
    except asyncio.TimeoutError:
        logger.error("DB save timeout - saving to disk")
        save_to_local_file(interaction)
    except Exception as e:
        logger.error(f"Save failed: {e}")
        # Last resort
        save_to_temp_file(interaction)
```

---

## 8. Testing Strategy

### 8.1 Testing SSE Endpoints

```bash
# Test basic streaming
curl -N http://localhost:8000/chats/test_chat/interactions \
  -H "Content-Type: application/json" \
  -d '{"user_message": "Hello"}'

# Test cancellation
# Terminal 1: Start streaming
curl -N http://localhost:8000/chats/test_chat/interactions/int_123 ...

# Terminal 2: Cancel it
curl -X POST http://localhost:8000/chats/test_chat/interactions/int_123/cancel

# Test approval
# Terminal 1: Start streaming (will block at approval)
curl -N http://localhost:8000/chats/test_chat/interactions ...

# Terminal 2: Approve it
curl -X POST http://localhost:8000/chats/test_chat/interactions/int_123/approve \
  -H "Content-Type: application/json" \
  -d '{"approval_id": "approval_abc", "approved": true}'
```

### 8.2 Unit Tests

```python
@pytest.mark.asyncio
async def test_approval_blocks_agent():
    manager = ApprovalManager()
    approval_id = "test_approval"
    
    # Start agent (will block)
    task = asyncio.create_task(manager.request_approval(approval_id))
    
    # Wait a bit
    await asyncio.sleep(0.1)
    assert not task.done()  # Still blocked
    
    # Approve
    manager.respond(approval_id, True)
    
    # Should unblock
    result = await task
    assert result == True
```

---

## 9. Deployment Considerations

### 9.1 Single Instance (Initial)

**Setup:**
- One FastAPI process
- File-based storage
- In-memory approval/cancellation state
- No Redis/PostgreSQL needed

**Limitations:**
- Process restart loses running interactions
- No horizontal scaling

**Acceptable for:** Development, single-user, side projects

### 9.2 Multi-Instance (Future)

**Required Changes:**
- Move approval state to Redis (pub/sub)
- Move file storage to PostgreSQL
- Add sticky sessions for SSE connections OR use shared state

**Not needed initially** - start simple!

---

## 10. Security Considerations

### 10.1 Tool Execution

**Risk:** Agent could execute arbitrary code/commands.

**Mitigations:**
1. Always require approval for dangerous tools (file write, code execution)
2. Sandbox tool execution (Docker containers, restricted filesystem)
3. Log all tool executions
4. Rate limiting on tool calls

### 10.2 Checkpoint Storage

**Risk:** Sensitive data in conversation history.

**Mitigations:**
1. Encrypt interaction files at rest
2. Sanitize/redact sensitive data before storage
3. Access control on chat IDs

---

## 11. Performance Considerations

### 11.1 Streaming Optimization

- Use `StreamingResponse` with async generators (FastAPI handles buffering)
- Flush SSE events immediately (`yield` sends data)
- No need to batch events unless very high frequency

### 11.2 Checkpoint I/O

- Checkpoints are write-heavy (every interaction completion)
- Use async file I/O (`aiofiles`)
- Consider write-ahead logging for durability
- Batch multiple checkpoint attributes in single write

### 11.3 Memory Management

- Don't hold entire conversation history in memory
- Load interactions on-demand
- Consider event streaming for very long interactions

---

## 12. Future Enhancements

### 12.1 Streaming Tool Results

Some tools (code execution) could stream output in real-time:

```python
async def execute_code_streaming(code: str):
    process = await asyncio.create_subprocess_shell(
        code, stdout=asyncio.subprocess.PIPE
    )
    
    async for line in process.stdout:
        yield ToolOutputChunk(chunk=line.decode())
```

### 12.2 Parallel Tool Execution

Execute multiple tools concurrently:

```python
results = await asyncio.gather(*[
    execute_tool(call) for call in tool_calls
])
```

### 12.3 Conversation Branches

Add `parent_id` to Interaction model to support branching conversations.

---

## 13. Quick Start Implementation Checklist

### Phase 1: Core SSE + Basic Agent
- [ ] Define data models (Event, Interaction, Chat, AgentState)
- [ ] Implement basic Agent with tool calling loop
- [ ] Implement SSE endpoint for interaction streaming
- [ ] Implement file-based InteractionStore
- [ ] Test with simple echo tool

### Phase 2: Approvals + Cancellation
- [ ] Implement ApprovalManager with asyncio.Event
- [ ] Add POST /approve endpoint
- [ ] Integrate approval into agent loop
- [ ] Implement cancellation with asyncio.Event
- [ ] Add POST /cancel endpoint
- [ ] Test approval and cancellation flows

### Phase 3: Checkpointing + Edit
- [ ] Implement checkpoint save in finally block with shield
- [ ] Add GET /chats/{id} endpoint
- [ ] Implement edit functionality (load previous state)
- [ ] Add POST /edit endpoint
- [ ] Test edit flow with state restoration

### Phase 4: Error Handling + Robustness
- [ ] Add comprehensive error handling
- [ ] Implement fallback checkpoint saves
- [ ] Add logging and monitoring
- [ ] Test failure scenarios
- [ ] Add integration tests
