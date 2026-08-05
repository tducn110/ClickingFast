var WinkBridgeBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // game-template/src/index.js
  var index_exports = {};
  __export(index_exports, {
    installBridge: () => installBridge
  });

  // game-template/src/contract.js
  var BRIDGE_VERSION = "9.0.0";
  var PROTOCOL_VERSION = 1;
  var ENVIRONMENTS = Object.freeze(["dev", "prod"]);
  var MESSAGE_TYPES = Object.freeze([
    "wink:hello",
    "wink:ready",
    "wink:session-required",
    "wink:session",
    "wink:lifecycle",
    "wink:complete",
    "wink:bridge-error"
  ]);
  var BRIDGE_ERROR_CODES = Object.freeze([
    "GAME_NOT_FOUND",
    "GAME_IFRAME_DISABLED",
    "GAME_ORIGIN_INVALID",
    "RUNTIME_CONFIG_INVALID",
    "FRAME_LOAD_TIMEOUT",
    "BRIDGE_READY_TIMEOUT",
    "PROTOCOL_MISMATCH",
    "SESSION_CREATE_FAILED",
    "SESSION_RENEWAL_FAILED",
    "SESSION_EXPIRED",
    "CAPABILITY_DENIED",
    "PARENT_REQUIRED",
    "API_NETWORK_ERROR",
    "MESSAGE_REJECTED"
  ]);
  var STATE_PHASES = Object.freeze([
    "booting",
    "loading_config",
    "waiting_parent_hello",
    "waiting_session",
    "ready_anonymous",
    "ready_authenticated",
    "renewing",
    "error"
  ]);
  var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var SESSION_FIELDS = [
    "accessToken",
    "apiBase",
    "capabilities",
    "environment",
    "expiresAt",
    "gameId",
    "gameOrigin",
    "identity",
    "protocolVersion",
    "scopes",
    "sessionId"
  ];
  var RUNTIME_CONFIG_FIELDS = [
    "allowedParentOrigins",
    "bridgeVersion",
    "environment",
    "gameId",
    "protocolVersion"
  ];
  var WinkBridgeError = class extends Error {
    constructor(code, message, recoverable = false) {
      super(message);
      this.name = "WinkBridgeError";
      this.code = code;
      this.recoverable = recoverable;
    }
    toJSON() {
      return {
        code: this.code,
        message: this.message,
        recoverable: this.recoverable
      };
    }
  };
  function bridgeError(code, message, recoverable = false) {
    return new WinkBridgeError(code, message, recoverable);
  }
  function isUuid(value) {
    return typeof value === "string" && UUID_PATTERN.test(value);
  }
  function isExactOrigin(value) {
    if (typeof value !== "string" || value === "*" || value.length === 0) {
      return false;
    }
    try {
      const parsed = new URL(value);
      return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.username === "" && parsed.password === "" && parsed.origin === value;
    } catch {
      return false;
    }
  }
  function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function hasExactKeys(value, required, optional = []) {
    if (!isPlainObject(value)) {
      return false;
    }
    const keys = Object.keys(value).sort();
    const allowed = [...required, ...optional].sort();
    if (keys.some((key) => !allowed.includes(key))) {
      return false;
    }
    return required.every((key) => Object.hasOwn(value, key));
  }
  function isJsonSafe(value, depth = 0) {
    if (depth > 8) {
      return false;
    }
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      return true;
    }
    if (typeof value === "number") {
      return Number.isFinite(value);
    }
    if (Array.isArray(value)) {
      return value.every((item) => isJsonSafe(item, depth + 1));
    }
    if (isPlainObject(value)) {
      return Object.entries(value).every(
        ([key, item]) => key.length > 0 && key.length <= 128 && isJsonSafe(item, depth + 1)
      );
    }
    return false;
  }
  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) {
        deepFreeze(child);
      }
      Object.freeze(value);
    }
    return value;
  }
  function assertRuntimeConfig(value) {
    if (!hasExactKeys(value, RUNTIME_CONFIG_FIELDS)) {
      throw bridgeError(
        "RUNTIME_CONFIG_INVALID",
        "Runtime configuration is invalid"
      );
    }
    if (value.protocolVersion !== PROTOCOL_VERSION) {
      throw bridgeError("PROTOCOL_MISMATCH", "Protocol version is incompatible");
    }
    if (value.bridgeVersion !== BRIDGE_VERSION) {
      throw bridgeError("PROTOCOL_MISMATCH", "Bridge version is incompatible");
    }
    if (!isUuid(value.gameId) || !ENVIRONMENTS.includes(value.environment)) {
      throw bridgeError(
        "RUNTIME_CONFIG_INVALID",
        "Runtime configuration is invalid"
      );
    }
    if (!Array.isArray(value.allowedParentOrigins) || value.allowedParentOrigins.length === 0 || value.allowedParentOrigins.some((origin) => !isExactOrigin(origin)) || new Set(value.allowedParentOrigins).size !== value.allowedParentOrigins.length) {
      throw bridgeError(
        "RUNTIME_CONFIG_INVALID",
        "Runtime configuration is invalid"
      );
    }
    return deepFreeze({
      gameId: value.gameId,
      environment: value.environment,
      protocolVersion: value.protocolVersion,
      bridgeVersion: value.bridgeVersion,
      allowedParentOrigins: [...value.allowedParentOrigins]
    });
  }
  function isApiBase(value) {
    if (typeof value !== "string" || value.length === 0) {
      return false;
    }
    try {
      const parsed = new URL(value);
      return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.username === "" && parsed.password === "" && parsed.search === "" && parsed.hash === "" && `${parsed.origin}${parsed.pathname}` === value;
    } catch {
      return false;
    }
  }
  function assertCapabilities(value, canSubmitScore) {
    if (!hasExactKeys(value, [
      "complete",
      "getLeaderboard",
      "submitScore"
    ]) || value.getLeaderboard !== true || value.complete !== true || value.submitScore !== canSubmitScore) {
      throw bridgeError("PROTOCOL_MISMATCH", "Session capabilities are invalid");
    }
  }
  function assertIdentity(value, canSubmitScore) {
    if (hasExactKeys(value, ["type"]) && value.type === "anonymous") {
      if (canSubmitScore) {
        throw bridgeError("PROTOCOL_MISMATCH", "Session identity is invalid");
      }
      return;
    }
    if (!hasExactKeys(value, ["type", "user"]) || value.type !== "user" || !hasExactKeys(value.user, [
      "avatarUrl",
      "displayName",
      "id",
      "isGuest"
    ]) || !isUuid(value.user.id) || !(value.user.displayName === null || typeof value.user.displayName === "string") || !(value.user.avatarUrl === null || typeof value.user.avatarUrl === "string") || typeof value.user.isGuest !== "boolean" || canSubmitScore !== !value.user.isGuest) {
      throw bridgeError("PROTOCOL_MISMATCH", "Session identity is invalid");
    }
  }
  function assertGameSession(value, expected = {}) {
    if (!hasExactKeys(value, SESSION_FIELDS)) {
      throw bridgeError("PROTOCOL_MISMATCH", "Session response is invalid");
    }
    if (typeof value.accessToken !== "string" || value.accessToken.length === 0 || !isUuid(value.sessionId) || !isUuid(value.gameId) || !isExactOrigin(value.gameOrigin) || !isApiBase(value.apiBase) || !ENVIRONMENTS.includes(value.environment) || value.protocolVersion !== PROTOCOL_VERSION || typeof value.expiresAt !== "string" || !Number.isFinite(Date.parse(value.expiresAt))) {
      throw bridgeError("PROTOCOL_MISMATCH", "Session response is invalid");
    }
    if (expected.gameId && value.gameId !== expected.gameId) {
      throw bridgeError("PROTOCOL_MISMATCH", "Session game is incompatible");
    }
    if (expected.gameOrigin && value.gameOrigin !== expected.gameOrigin) {
      throw bridgeError("GAME_ORIGIN_INVALID", "Session game origin is invalid");
    }
    if (expected.environment && value.environment !== expected.environment) {
      throw bridgeError(
        "PROTOCOL_MISMATCH",
        "Session environment is incompatible"
      );
    }
    const canSubmitScore = Array.isArray(value.scopes) && value.scopes.length === 2 && value.scopes[0] === "leaderboard:read" && value.scopes[1] === "leaderboard:write";
    const readOnly = Array.isArray(value.scopes) && value.scopes.length === 1 && value.scopes[0] === "leaderboard:read";
    if (!canSubmitScore && !readOnly) {
      throw bridgeError("PROTOCOL_MISMATCH", "Session scopes are invalid");
    }
    assertCapabilities(value.capabilities, canSubmitScore);
    assertIdentity(value.identity, canSubmitScore);
    return value;
  }
  function assertCompletionInput(value) {
    if (!hasExactKeys(value, ["roundId"], ["metadata", "playDurationMs"]) || typeof value.roundId !== "string" || value.roundId.length === 0 || value.roundId.length > 128 || Object.hasOwn(value, "playDurationMs") && (!Number.isInteger(value.playDurationMs) || value.playDurationMs < 0 || value.playDurationMs > 864e5) || Object.hasOwn(value, "metadata") && (!isPlainObject(value.metadata) || !isJsonSafe(value.metadata))) {
      throw bridgeError("MESSAGE_REJECTED", "Message rejected", true);
    }
    return value;
  }
  function assertMessagePayload(type, payload) {
    switch (type) {
      case "wink:hello":
        if (!hasExactKeys(payload, [])) {
          break;
        }
        return payload;
      case "wink:ready":
        if (hasExactKeys(payload, ["bridgeVersion", "environment"]) && payload.bridgeVersion === BRIDGE_VERSION && ENVIRONMENTS.includes(payload.environment)) {
          return payload;
        }
        break;
      case "wink:session-required":
        if (hasExactKeys(payload, ["reason"], ["sessionId"]) && ["near_expiry", "expired", "recovery"].includes(payload.reason) && (!Object.hasOwn(payload, "sessionId") || isUuid(payload.sessionId))) {
          return payload;
        }
        break;
      case "wink:session":
        if (hasExactKeys(payload, ["session"])) {
          assertGameSession(payload.session);
          return payload;
        }
        break;
      case "wink:lifecycle":
        if (hasExactKeys(payload, ["muted", "paused"]) && typeof payload.paused === "boolean" && typeof payload.muted === "boolean") {
          return payload;
        }
        break;
      case "wink:complete":
        return assertCompletionInput(payload);
      case "wink:bridge-error":
        if (hasExactKeys(payload, [
          "code",
          "message",
          "phase",
          "recoverable"
        ]) && BRIDGE_ERROR_CODES.includes(payload.code) && STATE_PHASES.includes(payload.phase) && typeof payload.recoverable === "boolean" && typeof payload.message === "string" && payload.message.length > 0 && payload.message.length <= 256) {
          return payload;
        }
        break;
      default:
        break;
    }
    throw bridgeError("MESSAGE_REJECTED", "Message rejected", true);
  }

  // game-template/src/api-client.js
  function assertLeaderboardOptions(value) {
    if (value === void 0) {
      return {};
    }
    if (!hasExactKeys(value, [], ["limit", "offset"]) || Object.hasOwn(value, "limit") && (!Number.isInteger(value.limit) || value.limit < 1 || value.limit > 500) || Object.hasOwn(value, "offset") && (!Number.isInteger(value.offset) || value.offset < 0)) {
      throw bridgeError("MESSAGE_REJECTED", "Leaderboard options are invalid");
    }
    return value;
  }
  function assertScoreInput(value) {
    if (!hasExactKeys(value, ["score"], [
      "counter",
      "gameMode",
      "metadata",
      "playTime"
    ]) || !Number.isInteger(value.score) || value.score < 0 || Object.hasOwn(value, "playTime") && (!Number.isInteger(value.playTime) || value.playTime < 0) || Object.hasOwn(value, "gameMode") && (typeof value.gameMode !== "string" || value.gameMode.length > 100) || Object.hasOwn(value, "counter") && (!Number.isInteger(value.counter) || value.counter < 0) || Object.hasOwn(value, "metadata") && (!isPlainObject(value.metadata) || !isJsonSafe(value.metadata))) {
      throw bridgeError("MESSAGE_REJECTED", "Score input is invalid");
    }
    return value;
  }
  function createLeaderboardUrl(apiBase, gameId, options) {
    const url = new URL(
      `${apiBase.replace(/\/$/, "")}/games/${gameId}/leaderboard`
    );
    if (Object.hasOwn(options, "limit")) {
      url.searchParams.set("limit", String(options.limit));
    }
    if (Object.hasOwn(options, "offset")) {
      url.searchParams.set("offset", String(options.offset));
    }
    return url.toString();
  }
  function createScopedApiClient({
    session,
    fetchImpl = globalThis.fetch,
    sendCompletion = () => {
    },
    onSessionExpired = () => {
    }
  }) {
    assertGameSession(session);
    if (typeof fetchImpl !== "function" || typeof sendCompletion !== "function" || typeof onSessionExpired !== "function") {
      throw bridgeError("API_NETWORK_ERROR", "Game API is unavailable");
    }
    const accessToken = session.accessToken;
    const gameId = session.gameId;
    const apiBase = session.apiBase;
    const canSubmitScore = session.capabilities.submitScore;
    let expirySignalled = false;
    async function request(url, options) {
      let response;
      try {
        response = await fetchImpl(url, options);
      } catch {
        throw bridgeError(
          "API_NETWORK_ERROR",
          "Game API request failed",
          true
        );
      }
      let envelope;
      try {
        envelope = await response.json();
      } catch {
        throw bridgeError(
          "API_NETWORK_ERROR",
          "Game API response is invalid",
          true
        );
      }
      if (!response.ok) {
        if (response.status === 401) {
          if (!expirySignalled) {
            expirySignalled = true;
            onSessionExpired();
          }
          throw bridgeError(
            "SESSION_EXPIRED",
            "Game session expired",
            true
          );
        }
        if (response.status === 403 && isPlainObject(envelope) && isPlainObject(envelope.error) && envelope.error.code === "CAPABILITY_DENIED") {
          throw bridgeError(
            "CAPABILITY_DENIED",
            "Capability is not available"
          );
        }
        throw bridgeError(
          "API_NETWORK_ERROR",
          "Game API request failed",
          response.status >= 500
        );
      }
      if (!hasExactKeys(envelope, ["data", "success"], ["meta"]) || envelope.success !== true || !isPlainObject(envelope.data)) {
        throw bridgeError(
          "API_NETWORK_ERROR",
          "Game API response is invalid",
          true
        );
      }
      return envelope.data;
    }
    async function getLeaderboard(options) {
      const normalized = assertLeaderboardOptions(options);
      return request(createLeaderboardUrl(apiBase, gameId, normalized), {
        method: "GET",
        credentials: "omit",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });
    }
    async function submitScore(input) {
      if (!canSubmitScore) {
        throw bridgeError(
          "CAPABILITY_DENIED",
          "Capability is not available"
        );
      }
      const body = assertScoreInput(input);
      return request(createLeaderboardUrl(apiBase, gameId, {}), {
        method: "POST",
        credentials: "omit",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
    }
    function complete(input) {
      sendCompletion(assertCompletionInput(input));
    }
    return Object.freeze({
      getLeaderboard,
      submitScore,
      complete
    });
  }

  // game-template/src/message-protocol.js
  var PARENT_TO_GAME = /* @__PURE__ */ new Set([
    "wink:hello",
    "wink:session",
    "wink:lifecycle"
  ]);
  var GAME_TO_PARENT = /* @__PURE__ */ new Set([
    "wink:ready",
    "wink:session-required",
    "wink:complete",
    "wink:bridge-error"
  ]);
  function assertRequestId(value) {
    if (value !== void 0 && (typeof value !== "string" || value.length === 0 || value.length > 128)) {
      throw bridgeError("MESSAGE_REJECTED", "Message rejected", true);
    }
  }
  function createEnvelope(type, gameId, payload, requestId) {
    if (!MESSAGE_TYPES.includes(type) || !isUuid(gameId)) {
      throw bridgeError("MESSAGE_REJECTED", "Message rejected", true);
    }
    assertRequestId(requestId);
    assertMessagePayload(type, payload);
    return {
      type,
      protocolVersion: PROTOCOL_VERSION,
      gameId,
      ...requestId === void 0 ? {} : { requestId },
      payload
    };
  }
  function parseEnvelope(value, expected = {}) {
    if (!hasExactKeys(
      value,
      ["gameId", "payload", "protocolVersion", "type"],
      ["requestId"]
    ) || !MESSAGE_TYPES.includes(value.type) || value.protocolVersion !== PROTOCOL_VERSION || !isUuid(value.gameId)) {
      throw bridgeError("MESSAGE_REJECTED", "Message rejected", true);
    }
    assertRequestId(value.requestId);
    if (expected.type && value.type !== expected.type) {
      throw bridgeError("MESSAGE_REJECTED", "Message rejected", true);
    }
    if (expected.gameId && value.gameId !== expected.gameId) {
      throw bridgeError("MESSAGE_REJECTED", "Message rejected", true);
    }
    assertMessagePayload(value.type, value.payload);
    return value;
  }
  function acceptMessage(event, expected) {
    const rejected = () => ({
      accepted: false,
      error: {
        code: "MESSAGE_REJECTED",
        message: "Message rejected",
        recoverable: true
      }
    });
    if (!event || !expected || event.source !== expected.source || event.origin !== expected.origin) {
      return rejected();
    }
    try {
      const message = parseEnvelope(event.data, {
        gameId: expected.gameId
      });
      const allowed = expected.direction === "parent-to-game" ? PARENT_TO_GAME : expected.direction === "game-to-parent" ? GAME_TO_PARENT : null;
      if (!allowed || !allowed.has(message.type)) {
        return rejected();
      }
      return { accepted: true, message };
    } catch {
      return rejected();
    }
  }

  // game-template/src/bridge-state.js
  var EMPTY_CAPABILITIES = Object.freeze({
    getLeaderboard: false,
    submitScore: false,
    complete: false
  });
  function createBridgeStateMachine({
    now = Date.now,
    setTimeoutImpl = globalThis.setTimeout.bind(globalThis),
    clearTimeoutImpl = globalThis.clearTimeout.bind(globalThis),
    sendToParent = () => {
    },
    onDiagnostic = () => {
    },
    fetchImpl = globalThis.fetch,
    sessionTimeoutMs = 1e4
  } = {}) {
    let state = {
      phase: "booting",
      gameId: null,
      environment: null,
      sessionId: null,
      identityType: null,
      capabilities: EMPTY_CAPABILITIES,
      expiresAt: null,
      lifecycle: { paused: false, muted: false },
      error: null
    };
    let context = null;
    let parentSource = null;
    let parentOrigin = null;
    let currentSession = null;
    let apiClient = null;
    let renewalRequested = false;
    let sessionTimer = null;
    let renewalTimer = null;
    let expiryTimer = null;
    const subscribers = /* @__PURE__ */ new Set();
    const lifecycleListeners = {
      pause: /* @__PURE__ */ new Set(),
      resume: /* @__PURE__ */ new Set(),
      mute: /* @__PURE__ */ new Set(),
      unmute: /* @__PURE__ */ new Set()
    };
    function snapshot() {
      return deepFreeze({
        ...state,
        capabilities: { ...state.capabilities },
        lifecycle: { ...state.lifecycle },
        error: state.error ? { ...state.error } : null
      });
    }
    function publish(patch) {
      state = { ...state, ...patch };
      const next = snapshot();
      for (const listener of subscribers) {
        listener(next);
      }
      return next;
    }
    function clearTimer(name) {
      const timer = name === "session" ? sessionTimer : name === "renewal" ? renewalTimer : expiryTimer;
      if (timer !== null) {
        clearTimeoutImpl(timer);
      }
      if (name === "session") {
        sessionTimer = null;
      } else if (name === "renewal") {
        renewalTimer = null;
      } else {
        expiryTimer = null;
      }
    }
    function setFailure(code, message, recoverable) {
      apiClient = null;
      return publish({
        phase: "error",
        error: { code, message, recoverable }
      });
    }
    function startSessionTimeout(code) {
      clearTimer("session");
      sessionTimer = setTimeoutImpl(() => {
        sessionTimer = null;
        setFailure(
          code,
          code === "SESSION_CREATE_FAILED" ? "Game session was not received" : "Game session replacement was not received",
          true
        );
      }, sessionTimeoutMs);
    }
    function sendSessionRequired(reason) {
      if (renewalRequested || !currentSession || !context || !parentSource || !parentOrigin) {
        return;
      }
      renewalRequested = true;
      publish({
        phase: "renewing",
        error: reason === "expired" ? {
          code: "SESSION_EXPIRED",
          message: "Game session expired",
          recoverable: true
        } : null
      });
      sendToParent(
        createEnvelope("wink:session-required", context.gameId, {
          reason,
          sessionId: currentSession.sessionId
        }),
        parentOrigin
      );
      startSessionTimeout("SESSION_RENEWAL_FAILED");
    }
    function handleSessionExpired() {
      apiClient = null;
      sendSessionRequired("expired");
    }
    function scheduleSessionTimers(session) {
      clearTimer("renewal");
      clearTimer("expiry");
      const expiresAt = Date.parse(session.expiresAt);
      renewalTimer = setTimeoutImpl(
        () => {
          renewalTimer = null;
          sendSessionRequired("near_expiry");
        },
        Math.max(0, expiresAt - now() - 3e4)
      );
      expiryTimer = setTimeoutImpl(
        () => {
          expiryTimer = null;
          apiClient = null;
          if (!renewalRequested) {
            sendSessionRequired("expired");
          }
          setFailure("SESSION_EXPIRED", "Game session expired", true);
        },
        Math.max(0, expiresAt - now())
      );
    }
    function startLoadingConfig() {
      return publish({ phase: "loading_config", error: null });
    }
    function waitForParent(nextContext) {
      if (!hasExactKeys(nextContext, [
        "environment",
        "gameId",
        "gameOrigin"
      ]) || !isUuid(nextContext.gameId) || !isExactOrigin(nextContext.gameOrigin) || !["dev", "prod"].includes(nextContext.environment)) {
        throw bridgeError(
          "RUNTIME_CONFIG_INVALID",
          "Runtime configuration is invalid"
        );
      }
      context = { ...nextContext };
      return publish({
        phase: "waiting_parent_hello",
        gameId: context.gameId,
        environment: context.environment,
        error: null
      });
    }
    function bindParent(source, origin) {
      if (!context || !source || !isExactOrigin(origin) || parentSource && (parentSource !== source || parentOrigin !== origin)) {
        throw bridgeError("MESSAGE_REJECTED", "Message rejected", true);
      }
      parentSource = source;
      parentOrigin = origin;
      publish({ phase: "waiting_session", error: null });
      startSessionTimeout("SESSION_CREATE_FAILED");
    }
    function acceptSession(session) {
      if (!context || !parentSource || !parentOrigin) {
        throw bridgeError("MESSAGE_REJECTED", "Message rejected", true);
      }
      assertGameSession(session, {
        gameId: context.gameId,
        gameOrigin: context.gameOrigin,
        environment: context.environment
      });
      if (Date.parse(session.expiresAt) <= now()) {
        throw bridgeError("SESSION_EXPIRED", "Game session expired", true);
      }
      clearTimer("session");
      clearTimer("renewal");
      clearTimer("expiry");
      currentSession = session;
      renewalRequested = false;
      apiClient = createScopedApiClient({
        session,
        fetchImpl,
        sendCompletion: (input) => {
          sendToParent(
            createEnvelope("wink:complete", context.gameId, input),
            parentOrigin
          );
        },
        onSessionExpired: handleSessionExpired
      });
      const identityType = session.identity.type === "anonymous" ? "anonymous" : "user";
      const next = publish({
        phase: identityType === "anonymous" ? "ready_anonymous" : "ready_authenticated",
        sessionId: session.sessionId,
        identityType,
        capabilities: { ...session.capabilities },
        expiresAt: session.expiresAt,
        error: null
      });
      scheduleSessionTimers(session);
      return next;
    }
    function acceptLifecycle(value) {
      if (!hasExactKeys(value, ["muted", "paused"]) || typeof value.paused !== "boolean" || typeof value.muted !== "boolean") {
        throw bridgeError("MESSAGE_REJECTED", "Message rejected", true);
      }
      const previous = state.lifecycle;
      const next = { paused: value.paused, muted: value.muted };
      if (previous.paused !== next.paused) {
        const event = next.paused ? "pause" : "resume";
        for (const listener of lifecycleListeners[event]) {
          listener();
        }
      }
      if (previous.muted !== next.muted) {
        const event = next.muted ? "mute" : "unmute";
        for (const listener of lifecycleListeners[event]) {
          listener();
        }
      }
      return publish({ lifecycle: next });
    }
    function addLifecycleListener(type, listener) {
      if (typeof listener !== "function") {
        throw bridgeError("MESSAGE_REJECTED", "Listener is invalid");
      }
      lifecycleListeners[type].add(listener);
      return () => lifecycleListeners[type].delete(listener);
    }
    function requireClient() {
      if (apiClient) {
        return apiClient;
      }
      if (state.phase === "renewing" || state.error?.code === "SESSION_EXPIRED") {
        throw bridgeError(
          "SESSION_EXPIRED",
          "Game session expired",
          true
        );
      }
      throw bridgeError(
        "SESSION_CREATE_FAILED",
        "Game session is not ready",
        true
      );
    }
    function subscribe(listener) {
      if (typeof listener !== "function") {
        throw bridgeError("MESSAGE_REJECTED", "Listener is invalid");
      }
      subscribers.add(listener);
      listener(snapshot());
      return () => subscribers.delete(listener);
    }
    function help() {
      return deepFreeze({
        bridgeVersion: BRIDGE_VERSION,
        protocolVersion: PROTOCOL_VERSION,
        phase: state.phase,
        gameId: state.gameId,
        environment: state.environment,
        hasSession: apiClient !== null,
        capabilities: { ...state.capabilities },
        lifecycle: { ...state.lifecycle },
        errorCode: state.error?.code ?? null
      });
    }
    function destroy() {
      clearTimer("session");
      clearTimer("renewal");
      clearTimer("expiry");
      apiClient = null;
      currentSession = null;
      subscribers.clear();
      for (const listeners of Object.values(lifecycleListeners)) {
        listeners.clear();
      }
    }
    return Object.freeze({
      startLoadingConfig,
      waitForParent,
      bindParent,
      acceptSession,
      acceptLifecycle,
      getState: snapshot,
      getCapabilities: () => deepFreeze({ ...state.capabilities }),
      subscribe,
      getLeaderboard: async (options) => requireClient().getLeaderboard(options),
      submitScore: async (input) => requireClient().submitScore(input),
      complete: (input) => requireClient().complete(input),
      onPause: (listener) => addLifecycleListener("pause", listener),
      onResume: (listener) => addLifecycleListener("resume", listener),
      onMute: (listener) => addLifecycleListener("mute", listener),
      onUnmute: (listener) => addLifecycleListener("unmute", listener),
      fail: (code, message, recoverable = false) => {
        onDiagnostic({ code, recoverable });
        return setFailure(code, message, recoverable);
      },
      help,
      destroy
    });
  }

  // game-template/src/runtime-config.js
  async function loadRuntimeConfig({
    fetchImpl = globalThis.fetch,
    parentOrigin
  } = {}) {
    if (typeof fetchImpl !== "function") {
      throw bridgeError(
        "RUNTIME_CONFIG_INVALID",
        "Runtime configuration is unavailable"
      );
    }
    let response;
    try {
      response = await fetchImpl("/wink-runtime-config.json", {
        credentials: "omit"
      });
    } catch {
      throw bridgeError(
        "RUNTIME_CONFIG_INVALID",
        "Runtime configuration is unavailable"
      );
    }
    if (!response || response.ok !== true) {
      throw bridgeError(
        "RUNTIME_CONFIG_INVALID",
        "Runtime configuration is unavailable"
      );
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw bridgeError(
        "RUNTIME_CONFIG_INVALID",
        "Runtime configuration is invalid"
      );
    }
    let config;
    try {
      config = assertRuntimeConfig(body);
    } catch (error) {
      if (error instanceof WinkBridgeError) {
        throw error;
      }
      throw bridgeError(
        "RUNTIME_CONFIG_INVALID",
        "Runtime configuration is invalid"
      );
    }
    if (parentOrigin !== void 0 && (!isExactOrigin(parentOrigin) || !config.allowedParentOrigins.includes(parentOrigin))) {
      throw bridgeError(
        "RUNTIME_CONFIG_INVALID",
        "Parent origin is not allowed"
      );
    }
    return config;
  }

  // game-template/src/index.js
  function asBridgeError(error) {
    if (error instanceof WinkBridgeError) {
      return error;
    }
    return bridgeError(
      "RUNTIME_CONFIG_INVALID",
      "Runtime configuration is unavailable"
    );
  }
  function installBridge(targetWindow) {
    let runtimeConfig = null;
    let boundParent = null;
    let boundParentOrigin = null;
    const stateMachine = createBridgeStateMachine({
      fetchImpl: targetWindow.fetch.bind(targetWindow),
      sendToParent(message, targetOrigin) {
        if (boundParent && boundParentOrigin && targetOrigin === boundParentOrigin) {
          boundParent.postMessage(message, targetOrigin);
        }
      }
    });
    const bridge = Object.freeze({
      subscribe: stateMachine.subscribe,
      getState: stateMachine.getState,
      getCapabilities: stateMachine.getCapabilities,
      getLeaderboard: stateMachine.getLeaderboard,
      submitScore: stateMachine.submitScore,
      complete: stateMachine.complete,
      onPause: stateMachine.onPause,
      onResume: stateMachine.onResume,
      onMute: stateMachine.onMute,
      onUnmute: stateMachine.onUnmute,
      help: stateMachine.help
    });
    targetWindow.WinkBridge = bridge;
    targetWindow.WinkBridgeVersion = BRIDGE_VERSION;
    function sendError(error) {
      const normalized = asBridgeError(error);
      const before = stateMachine.getState();
      stateMachine.fail(
        normalized.code,
        normalized.message,
        normalized.recoverable
      );
      if (!boundParent || !boundParentOrigin || !runtimeConfig) {
        return;
      }
      boundParent.postMessage(
        createEnvelope("wink:bridge-error", runtimeConfig.gameId, {
          code: normalized.code,
          message: normalized.message,
          phase: before.phase,
          recoverable: normalized.recoverable
        }),
        boundParentOrigin
      );
    }
    function acceptBoundMessage(event) {
      if (!runtimeConfig || !boundParent || !boundParentOrigin) {
        return null;
      }
      const result = acceptMessage(event, {
        source: boundParent,
        origin: boundParentOrigin,
        gameId: runtimeConfig.gameId,
        direction: "parent-to-game"
      });
      return result.accepted ? result.message : null;
    }
    function onMessage(event) {
      if (!runtimeConfig) {
        return;
      }
      if (!boundParent) {
        if (event.source !== targetWindow.parent || !runtimeConfig.allowedParentOrigins.includes(event.origin)) {
          return;
        }
        const result = acceptMessage(event, {
          source: targetWindow.parent,
          origin: event.origin,
          gameId: runtimeConfig.gameId,
          direction: "parent-to-game"
        });
        if (!result.accepted || result.message.type !== "wink:hello") {
          return;
        }
        try {
          boundParent = targetWindow.parent;
          boundParentOrigin = event.origin;
          stateMachine.bindParent(boundParent, boundParentOrigin);
          boundParent.postMessage(
            createEnvelope("wink:ready", runtimeConfig.gameId, {
              bridgeVersion: BRIDGE_VERSION,
              environment: runtimeConfig.environment
            }),
            boundParentOrigin
          );
        } catch (error) {
          sendError(error);
        }
        return;
      }
      const message = acceptBoundMessage(event);
      if (!message) {
        return;
      }
      try {
        if (message.type === "wink:session") {
          stateMachine.acceptSession(message.payload.session);
        } else if (message.type === "wink:lifecycle") {
          stateMachine.acceptLifecycle(message.payload);
        }
      } catch (error) {
        sendError(error);
      }
    }
    targetWindow.addEventListener("message", onMessage);
    if (targetWindow.parent === targetWindow) {
      stateMachine.fail(
        "PARENT_REQUIRED",
        "Wink bridge requires an iframe parent"
      );
      return bridge;
    }
    stateMachine.startLoadingConfig();
    loadRuntimeConfig({ fetchImpl: targetWindow.fetch.bind(targetWindow) }).then((config) => {
      runtimeConfig = config;
      stateMachine.waitForParent({
        gameId: config.gameId,
        gameOrigin: targetWindow.location.origin,
        environment: config.environment
      });
    }).catch(sendError);
    return bridge;
  }
  if (typeof window !== "undefined") {
    installBridge(window);
  }
  return __toCommonJS(index_exports);
})();
