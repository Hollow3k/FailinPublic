import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from "path";
import axios from "axios";
import { main } from "./ai";

const apiUrl = "https://fail-in-public-api.onrender.com";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "Fail In Public" is now active!');

  const disposable = vscode.commands.registerCommand(
    "error-tweeter.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from Fail In Public!");
    }
  );
  
  const tryToCompile = vscode.commands.registerCommand(
    "error-tweeter.run",
    async () => {
      const currentFile = getActiveFilePath();

      if (!currentFile) {
        return;
      }
      try {
        await runCpp(currentFile);
      } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
      }
    }
  );

  // const loginReddit = vscode.commands.registerCommand(
  //   "error-tweeter.loginReddit",
  //   () => {
  //     const clientId = "920-zYRtWx_rflo153W6VA"; // your client ID
  //     const redirectUri = "http://localhost:3000/";
  //     const authUrl =
  //       `https://www.reddit.com/api/v1/authorize?` +
  //       `client_id=${clientId}&` +
  //       `response_type=code&` +
  //       `state=randomstring123&` + // can randomize later
  //       `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  //       `duration=permanent&` +
  //       `scope=submit`;

  //     vscode.env.openExternal(vscode.Uri.parse(authUrl));
  //     vscode.window.showInformationMessage(
  //       "Opened Reddit login page in browser!"
  //     );
  //   }
  // );
  // const creatingPost = vscode.commands.registerCommand(
  //   "error-tweeter.createPost",
  //   async () => {
  //     const p = await createPost(
  //       `Main.java:3: error: ';' expected        System.out.println("Hello World")                                         ^1 error`
  //     );

  //     console.log(p);
  //   }
  // );
  context.subscriptions.push(disposable, tryToCompile);
}
// This method is called when your extension is deactivated
export function deactivate() {}

// filePath is the .cpp file the user wants to run
function runCpp(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    const outputPath = path.join(path.dirname(filePath), "a.out");

    // Step 1: Compile
    exec(
      `g++ "${filePath}" -o "${outputPath}"`,
      async (compileErr, _, compileStderr) => {
        if (compileErr) {
          console.error("Compilation error detected:");
          // console.error(compileStderr);
          // const generatedPost = await createPost(compileStderr); // ai generated post
          const generatedPost = await main(compileStderr); // ai generated post
          console.log(generatedPost);
          postToBackend(generatedPost);
          reject(new Error("Compilation failed"));
          return;
        }

        // Step 2: Run program
        exec(`"${outputPath}"`, async (runErr, runStdout, runStderr) => {
          if (runErr) {
            console.error("Runtime error detected:");
            // const generatedPost = await createPost(runStderr); // ai generated post
            const generatedPost = await main(runStderr); // ai generated post
            postToBackend(generatedPost);
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

function getActiveFilePath(): string | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found!");
    return null;
  }
  return editor.document.fileName; // <-- full path to the opened file
}

const postToBackend = async (content: string) => {
  const p = await axios.post(`${apiUrl}/posts`, {
    username: "starz",
    message: content,
  });
  console.log("posted to database", p);
};