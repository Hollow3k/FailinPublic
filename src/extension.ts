import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from "path";
import axios from "axios";

const apiUrl = "https://fail-in-public-api-yzd5.onrender.com";

export function activate(context: vscode.ExtensionContext) {
  const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  myStatusBarItem.command = 'fip.run';
  myStatusBarItem.text = '$(play) FIP RUN';
  myStatusBarItem.tooltip = 'Click to run Fail in Public';
  myStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  myStatusBarItem.show();

  context.subscriptions.push(myStatusBarItem);
  console.log('FAIL IN PUBLIC extension is now active!');

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

/**
 * Get active file path
 */
function getActiveFilePath(): string | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found!");
    return null;
  }
  return editor.document.fileName; // <-- full path to the opened file
}

/**
 * Compile + run C++ file
 */
function runCpp(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    const outputPath = path.join(path.dirname(filePath), "a.out");

    // Step 1: Compile
    exec(
      `g++ "${filePath}" -o "${outputPath}"`,
      async (compileErr, _, compileStderr) => {
        if (compileErr) {
          console.error("Compilation error detected:");
          await postToBackend(compileStderr);
          reject(new Error("Compilation failed"));
          return;
        }

        // Step 2: Run program
        exec(`"${outputPath}"`, async (runErr, runStdout, runStderr) => {
          if (runErr) {
            console.error("Runtime error detected:");
            await postToBackend(runStderr);
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

/**
 * Get GitHub session (OAuth)
 */
async function getUserSession(): Promise<vscode.AuthenticationSession | null> {
  try {
    const session = await vscode.authentication.getSession(
      "github",
      ["read:user"], // GitHub scope
      { createIfNone: true } // prompt login if not logged in
    );
    return session;
  } catch (err) {
    vscode.window.showErrorMessage("Login failed: " + err);
    return null;
  }
}

/**
 * Post error to backend with GitHub username
 */
const postToBackend = async (e: string) => {
  const session = await getUserSession();
  if (!session) {
    vscode.window.showErrorMessage("You must sign in with GitHub first!");
    return;
  }

  // Fetch GitHub profile with accessToken
  const ghUser = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `token ${session.accessToken}` },
  });

  const username = ghUser.data.login;

  const p = await axios.post(`${apiUrl}/posts`, {
    username,
    error: e,
  });

  console.log("posted to database", p.data);
};