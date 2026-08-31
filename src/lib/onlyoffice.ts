/**
 * Loads the OnlyOffice editor API script from the document server.
 *
 * The script is fetched from the document server's own origin (not bundled), because it must
 * match the server's version exactly — a bundled copy would silently break the first time the
 * server is upgraded.
 */

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (elementId: string, config: unknown) => OnlyOfficeEditorInstance;
    };
  }
}

export interface OnlyOfficeEditorInstance {
  destroyEditor: () => void;
}

const SCRIPT_ID = "onlyoffice-api-script";

/**
 * Resolves once window.DocsAPI is available.
 *
 * Deduplicated by element id: React StrictMode mounts effects twice in development, and two
 * concurrent injections of the same script produce a hard-to-read race where the editor
 * mounts twice into the same div.
 */
export function loadOnlyOfficeApi(documentServerUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.DocsAPI) {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("The document server's editor script failed to load.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `${documentServerUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new Error(
          "Couldn't reach the document server. Check that DocumentServer__Url is correct and " +
            "that the server is running.",
        ),
      );

    document.head.appendChild(script);
  });
}
