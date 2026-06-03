import { SerenityClient } from "@serenity-star/sdk";

// ── Cached SDK objects ────────────────────────────────────────────────────────
let cachedVK = null;
let cachedConfigKey = null;

function readConfig() {
  return {
    apiKey:    document.getElementById("apiKey").value.trim(),
    baseUrl:   document.getElementById("baseUrl").value.trim().replace(/\/$/, "") || undefined,
    agentCode: document.getElementById("agentCode").value.trim(),
  };
}

function toConfigKey(c) {
  return `${c.apiKey}||${c.baseUrl}||${c.agentCode}`;
}

function validateConfig(cfg) {
  if (!cfg.apiKey)    throw new Error("Please set the API Key in the config bar.");
  if (!cfg.agentCode) throw new Error("Please set the Agent Code in the config bar.");
}

/**
 * Returns a VolatileKnowledgeManager for the current config.
 *
 * We use `activities.create()` because it is synchronous (no API call),
 * yet still wires up the correct baseUrl, authProvider, and agentCode.
 * Volatile knowledge endpoints are scoped to agentCode only — the agent
 * type does not change which endpoints are used.
 */
async function getVK() {
  const cfg = readConfig();
  validateConfig(cfg);

  const key = toConfigKey(cfg);
  if (cachedVK && cachedConfigKey === key) return cachedVK;

  const clientOptions = { apiKey: cfg.apiKey };
  if (cfg.baseUrl) clientOptions.baseUrl = cfg.baseUrl;

  const client = new SerenityClient(clientOptions);
  // activities.create() is synchronous — no network request, pure in-memory setup
  const agent = await client.agents.assistants.createConversation(cfg.agentCode);
  cachedVK = agent.volatileKnowledge;
  cachedConfigKey = key;
  return cachedVK;
}

// ── localStorage persistence ─────────────────────────────────────────────────
const LS_PREFIX = "vk-demo:";

function loadPersistedConfig() {
  ["baseUrl", "agentCode"].forEach((id) => {
    const saved = localStorage.getItem(LS_PREFIX + id);
    if (saved !== null) {
      const el = document.getElementById(id);
      if (el) el.value = saved;
    }
  });
  // apiKey: restore but do NOT log/expose — just fill the input silently
  const savedKey = localStorage.getItem(LS_PREFIX + "apiKey");
  if (savedKey !== null) {
    const el = document.getElementById("apiKey");
    if (el) el.value = savedKey;
  }
}

function persistConfig() {
  const cfg = readConfig();
  localStorage.setItem(LS_PREFIX + "baseUrl",   document.getElementById("baseUrl").value.trim());
  localStorage.setItem(LS_PREFIX + "agentCode", document.getElementById("agentCode").value.trim());
  localStorage.setItem(LS_PREFIX + "apiKey",    document.getElementById("apiKey").value.trim());
  return cfg;
}

loadPersistedConfig();

// Invalidate cache and persist when config inputs change
["apiKey", "baseUrl", "agentCode"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const reset = () => { cachedVK = null; cachedConfigKey = null; persistConfig(); };
  el.addEventListener("input", reset);
  el.addEventListener("change", reset);
});

// ── Queue badge ──────────────────────────────────────────────────────────────
function refreshQueueBadge() {
  if (!cachedVK) return;
  const ids = cachedVK.getIds();
  document.getElementById("globalIdCount").textContent = ids.length;
  document.getElementById("globalIds").textContent = JSON.stringify(ids);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? '<span class="spinner"></span> Running…' : "Execute";
}

function stringifyForDisplay(value) {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(
      value,
      (_key, currentValue) => {
        if (currentValue instanceof Error) {
          return {
            name: currentValue.name,
            message: currentValue.message,
          };
        }
        return currentValue;
      },
      2
    );
  } catch (_err) {
    return String(value);
  }
}

function extractErrorMessage(value) {
  if (!value) return "Unknown error.";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;

  if (typeof value === "object") {
    if (value.message) {
      const status = value.statusCode ? ` (HTTP ${value.statusCode})` : "";
      return `${value.message}${status}`;
    }
    if (value.error) return extractErrorMessage(value.error);
    if (value.errors) return stringifyForDisplay(value.errors);
  }

  return stringifyForDisplay(value);
}

function renderResponse(boxId, sumId, data, isSuccess) {
  const box = document.getElementById(boxId);
  const sum = document.getElementById(sumId);
  if (!box || !sum) return;

  box.classList.remove("empty", "success", "error");
  box.classList.add(isSuccess ? "success" : "error");
  box.textContent = stringifyForDisplay(data);

  sum.innerHTML = "";

  if (isSuccess) {
    if (data.id) {
      sum.appendChild(makePill(`ID: ${data.id}`, "id"));
    }
    if (data.status) {
      sum.appendChild(makePill(`status: ${data.status}`, "status-success"));
    }
    if (data.fileName) {
      sum.appendChild(makePill(`file: ${data.fileName}`, ""));
    }
    if (data.fileSize != null) {
      sum.appendChild(makePill(`size: ${formatBytes(data.fileSize)}`, ""));
    }
    if (data.expirationDate) {
      sum.appendChild(makePill(`expires: ${new Date(data.expirationDate).toLocaleDateString()}`, ""));
    }
  } else {
    const msg = extractErrorMessage(data);
    sum.appendChild(makePill(msg.slice(0, 120), "status-error"));
  }
}

function renderUploadRes(boxId, sumId, result) {
  if (result.success) {
    renderResponse(boxId, sumId, result, true);
    refreshQueueBadge();
  } else {
    const errMsg = extractErrorMessage(result) || "Upload failed";
    renderResponse(boxId, sumId, { success: false, error: { message: errMsg, details: result.error } }, false);
  }
}

function renderLocalResponse(boxId, sumId, data, label) {
  const box = document.getElementById(boxId);
  const sum = document.getElementById(sumId);
  if (!box || !sum) return;
  box.classList.remove("empty", "success", "error");
  box.classList.add("success");
  box.textContent = JSON.stringify(data, null, 2);
  sum.innerHTML = "";
  sum.appendChild(makePill(label, "status-success"));
}

function renderError(boxId, sumId, err) {
  const msg = extractErrorMessage(err);
  const box = document.getElementById(boxId);
  const sum = document.getElementById(sumId);
  if (!box || !sum) return;
  box.classList.remove("empty", "success", "error");
  box.classList.add("error");
  box.textContent = err instanceof Error || typeof err === "string" ? msg : stringifyForDisplay(err);
  sum.innerHTML = "";
  sum.appendChild(makePill(msg.slice(0, 120), "status-error"));
}

function makePill(text, cls) {
  const span = document.createElement("span");
  span.className = `pill${cls ? " " + cls : ""}`;
  span.textContent = text;
  return span;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Wraps an async action: sets loading, calls fn, handles errors, resets loading */
async function run(btnId, boxId, sumId, fn) {
  setLoading(btnId, true);
  try {
    await fn();
  } catch (err) {
    renderError(boxId, sumId, err);
  } finally {
    setLoading(btnId, false);
  }
}

// ── getSupportedMimeTypes ─────────────────────────────────────────────────────
document.getElementById("btn-getSupportedMimeTypes").addEventListener("click", () =>
  run("btn-getSupportedMimeTypes", "res-getSupportedMimeTypes", "sum-getSupportedMimeTypes", async () => {
    const vk = await getVK();
    const mimeTypes = await vk.getSupportedMimeTypes();
    const box = document.getElementById("res-getSupportedMimeTypes");
    const sum = document.getElementById("sum-getSupportedMimeTypes");
    box.classList.remove("empty", "error");
    box.classList.add("success");
    box.textContent = JSON.stringify(mimeTypes, null, 2);
    sum.innerHTML = "";
    sum.appendChild(makePill(`${mimeTypes.length} MIME type(s)`, "status-success"));
  })
);

// ── getById ───────────────────────────────────────────────────────────────────
document.getElementById("btn-getById").addEventListener("click", () =>
  run("btn-getById", "res-getById", "sum-getById", async () => {
    const fileId = document.getElementById("getById-fileId").value.trim();
    if (!fileId) throw new Error("File ID is required.");
    const vk = await getVK();
    const result = await vk.getById(fileId);
    renderResponse("res-getById", "sum-getById", result, result.success);
  })
);

// ── upload ────────────────────────────────────────────────────────────────────
document.getElementById("btn-upload").addEventListener("click", () =>
  run("btn-upload", "res-upload", "sum-upload", async () => {
    const fileInput = document.getElementById("upload-file");
    if (!fileInput.files.length) throw new Error("Please select a file.");
    const file = fileInput.files[0];

    const options = {};
    const noExp   = document.getElementById("upload-noExpiration").checked;
    const expDays = document.getElementById("upload-expirationDays").value;
    const procEmb = document.getElementById("upload-processEmbeddings").checked;
    const useVis  = document.getElementById("upload-useVision").checked;

    if (noExp)   options.noExpiration = true;
    if (expDays) options.expirationDays = Number(expDays);
    if (procEmb) options.processEmbeddings = true;
    if (useVis)  options.useVision = true;

    const vk = await getVK();
    const result = await vk.upload(file, options);
    renderUploadRes("res-upload", "sum-upload", result);
  })
);

// ── uploadFromFileId ──────────────────────────────────────────────────────────
document.getElementById("btn-fromFileId").addEventListener("click", () =>
  run("btn-fromFileId", "res-fromFileId", "sum-fromFileId", async () => {
    const fileId = document.getElementById("fromFileId-fileId").value.trim();
    if (!fileId) throw new Error("File ID is required.");

    const options = {};
    const cb      = document.getElementById("fromFileId-callbackUrl").value.trim();
    const expDays = document.getElementById("fromFileId-expirationDays").value;
    const noExp   = document.getElementById("fromFileId-noExpiration").checked;
    const procEmb = document.getElementById("fromFileId-processEmbeddings").checked;

    if (cb)      options.callbackUrl = cb;
    if (noExp)   options.noExpiration = true;
    if (expDays) options.expirationDays = Number(expDays);
    if (procEmb) options.processEmbeddings = true;

    const vk = await getVK();
    const result = await vk.uploadFromFileId(fileId, options);
    renderUploadRes("res-fromFileId", "sum-fromFileId", result);
  })
);

// ── uploadFromUrl ─────────────────────────────────────────────────────────────
document.getElementById("btn-fromUrl").addEventListener("click", () =>
  run("btn-fromUrl", "res-fromUrl", "sum-fromUrl", async () => {
    const fileUrl = document.getElementById("fromUrl-fileUrl").value.trim();
    if (!fileUrl) throw new Error("File URL is required.");

    const options = {};
    const fn      = document.getElementById("fromUrl-fileName").value.trim();
    const cb      = document.getElementById("fromUrl-callbackUrl").value.trim();
    const expDays = document.getElementById("fromUrl-expirationDays").value;
    const noExp   = document.getElementById("fromUrl-noExpiration").checked;
    const procEmb = document.getElementById("fromUrl-processEmbeddings").checked;

    if (fn)      options.fileName = fn;
    if (cb)      options.callbackUrl = cb;
    if (noExp)   options.noExpiration = true;
    if (expDays) options.expirationDays = Number(expDays);
    if (procEmb) options.processEmbeddings = true;

    const vk = await getVK();
    const result = await vk.uploadFromUrl(fileUrl, options);
    renderUploadRes("res-fromUrl", "sum-fromUrl", result);
  })
);

// ── uploadFromBase64 ──────────────────────────────────────────────────────────
document.getElementById("fromBase64-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById("fromBase64-fileName").value = file.name;
  document.getElementById("fromBase64-mimeType").value = file.type || "application/octet-stream";
  document.getElementById("fromBase64-info").textContent =
    `${file.name} · ${formatBytes(file.size)} · ${file.type || "unknown"} — ready to encode.`;
});

document.getElementById("btn-fromBase64").addEventListener("click", () =>
  run("btn-fromBase64", "res-fromBase64", "sum-fromBase64", async () => {
    const fileInput   = document.getElementById("fromBase64-file");
    const fileName    = document.getElementById("fromBase64-fileName").value.trim();
    const mimeType    = document.getElementById("fromBase64-mimeType").value.trim();

    if (!fileInput.files.length) throw new Error("Please select a file to convert to base64.");
    if (!fileName) throw new Error("File Name is required.");
    if (!mimeType) throw new Error("MIME Type is required.");

    const contentBase64 = await fileToBase64(fileInput.files[0]);

    const options = { fileName, mimeType };
    const cb      = document.getElementById("fromBase64-callbackUrl").value.trim();
    const expDays = document.getElementById("fromBase64-expirationDays").value;
    const noExp   = document.getElementById("fromBase64-noExpiration").checked;
    const procEmb = document.getElementById("fromBase64-processEmbeddings").checked;

    if (cb)      options.callbackUrl = cb;
    if (noExp)   options.noExpiration = true;
    if (expDays) options.expirationDays = Number(expDays);
    if (procEmb) options.processEmbeddings = true;

    const vk = await getVK();
    const result = await vk.uploadFromBase64(contentBase64, options);
    renderUploadRes("res-fromBase64", "sum-fromBase64", result);
  })
);

// ── getIds (local) ────────────────────────────────────────────────────────────
document.getElementById("btn-getIds").addEventListener("click", async () => {
  run("btn-getIds", "res-getIds", "sum-getIds", async () => {
    // Needs the VK instance (no API call made inside getIds itself)
    const vk = await getVK();
    const ids = vk.getIds();
    renderLocalResponse("res-getIds", "sum-getIds", ids, `${ids.length} ID(s)`);
  });
});

// ── removeById (local) ────────────────────────────────────────────────────────
document.getElementById("btn-removeById").addEventListener("click", () =>
  run("btn-removeById", "res-removeById", "sum-removeById", async () => {
    const fileId = document.getElementById("removeById-fileId").value.trim();
    if (!fileId) throw new Error("File ID is required.");
    const vk = await getVK();
    const removed = vk.removeById(fileId);
    refreshQueueBadge();
    renderLocalResponse(
      "res-removeById", "sum-removeById",
      { removed, fileId, remainingQueue: vk.getIds() },
      removed ? "Removed" : "Not found"
    );
  })
);

// ── clear (local) ─────────────────────────────────────────────────────────────
document.getElementById("btn-clear").addEventListener("click", () =>
  run("btn-clear", "res-clear", "sum-clear", async () => {
    const vk = await getVK();
    const countBefore = vk.getIds().length;
    vk.clear();
    refreshQueueBadge();
    renderLocalResponse(
      "res-clear", "sum-clear",
      { cleared: true, removedCount: countBefore },
      `Cleared ${countBefore} ID(s)`
    );
  })
);
