from pydantic import BaseModel, Field

from e2b_code_interpreter import Sandbox

from src.agent.tool import Tool

class CodeInterpretToolInput(BaseModel):
    code: str = Field(description="The Python code to run", min_length=1)

class CodeInterpretTool(Tool):
    name = "code_interpret"
    description = "A tool to execute python code snippets and return the output. No backsticks, just a valid python code."
    input_model = CodeInterpretToolInput

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def _execute(self, input_params: dict) -> str:
        params = CodeInterpretToolInput.model_validate(input_params)

        with Sandbox.create(api_key=self.api_key) as sandbox:
            execution = sandbox.run_code(params.code)
            return str(execution)

        