import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from "path";
import axios from "axios";

const apiUrl = "https://fail-in-public-api-yzd5.onrender.com";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension FAIL IN PUBLIC is now active!');

  const hello = vscode.commands.registerCommand("fip.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from fip!");
  });

  const runner = vscode.commands.registerCommand("fip.run", async () => {
    const currentFile = getActiveFilePath();

    if (!currentFile) {
      return;
    }
    try {
      await runCpp(currentFile);
    } catch (err: any) {
      vscode.window.showErrorMessage(err.message);
    }
  });

  context.subscriptions.push(hello, runner);
}

export function deactivate() {}

function getActiveFilePath(): string | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found!");
    return null;
  }
  return editor.document.fileName; // <-- full path to the opened file
}

function runCpp(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    const outputPath = path.join(path.dirname(filePath), "a.out");

    // Step 1: Compile
    exec(
      `g++ "${filePath}" -o "${outputPath}"`,
      async (compileErr, _, compileStderr) => {
        if (compileErr) {
          console.error("Compilation error detected:");

          postToBackend(compileStderr);

          reject(new Error("Compilation failed"));
          return;
        }

        // Step 2: Run program
        exec(`"${outputPath}"`, async (runErr, runStdout, runStderr) => {
          if (runErr) {
            console.error("Runtime error detected:");
            postToBackend(runStderr);
            reject(new Error("Runtime failed"));
            return;
          }

          console.log("Program output:");
          console.log(runStdout); // <-- successful output
          resolve();
        });
      }
    );
  });
}

const postToBackend = async (e: string) => {
  const p = await axios.post(`${apiUrl}/posts`, {
    username: "starz",
    error: e,
  });
  console.log("posted to database", p);
};