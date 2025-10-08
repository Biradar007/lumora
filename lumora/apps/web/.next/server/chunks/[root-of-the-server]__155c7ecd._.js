module.exports = [
"[project]/lumora/apps/web/.next-internal/server/app/api/chat/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lumora/packages/db/env.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "env",
    ()=>env
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
;
const RawEnvSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    AI_PROVIDER: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'openai',
        'gemini'
    ]).optional(),
    OPENAI_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).optional(),
    GEMINI_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).optional(),
    // MONGODB_URI: z.string().min(1),
    MAIL_HOST: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    MAIL_PORT: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    MAIL_USER: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    MAIL_PASSWORD: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    MAIL_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    COUNSELING_INBOX: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email().optional(),
    COUNSELING_CONTACTS_JSON: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
}).superRefine((val, ctx)=>{
    const provider = val.AI_PROVIDER ?? (val.OPENAI_API_KEY ? 'openai' : val.GEMINI_API_KEY ? 'gemini' : undefined);
    if (!provider) {
        ctx.addIssue({
            code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].ZodIssueCode.custom,
            message: 'Configure AI_PROVIDER or provide at least one API key for OpenAI or Gemini.',
            path: [
                'AI_PROVIDER'
            ]
        });
        return;
    }
    if (provider === 'openai' && !val.OPENAI_API_KEY) {
        ctx.addIssue({
            code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].ZodIssueCode.custom,
            message: 'OPENAI_API_KEY is required when AI_PROVIDER resolves to "openai".',
            path: [
                'OPENAI_API_KEY'
            ]
        });
    }
    if (provider === 'gemini' && !val.GEMINI_API_KEY) {
        ctx.addIssue({
            code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].ZodIssueCode.custom,
            message: 'GEMINI_API_KEY is required when AI_PROVIDER resolves to "gemini".',
            path: [
                'GEMINI_API_KEY'
            ]
        });
    }
});
const rawEnv = RawEnvSchema.parse({
    AI_PROVIDER: process.env.AI_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    // MONGODB_URI: process.env.MONGODB_URI,
    MAIL_HOST: process.env.MAIL_HOST,
    MAIL_PORT: process.env.MAIL_PORT,
    MAIL_USER: process.env.MAIL_USER,
    MAIL_PASSWORD: process.env.MAIL_PASSWORD,
    MAIL_API_KEY: process.env.MAIL_API_KEY,
    COUNSELING_INBOX: process.env.COUNSELING_INBOX,
    COUNSELING_CONTACTS_JSON: process.env.COUNSELING_CONTACTS_JSON
});
const computedProvider = (()=>{
    if (rawEnv.AI_PROVIDER) {
        return rawEnv.AI_PROVIDER;
    }
    if (rawEnv.OPENAI_API_KEY) {
        return 'openai';
    }
    return 'gemini';
})();
const env = {
    ...rawEnv,
    AI_PROVIDER: computedProvider
};
}),
"[externals]/mongoose [external] (mongoose, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("mongoose", () => require("mongoose"));

module.exports = mod;
}),
"[project]/lumora/packages/db/AnalyticsEvent.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AnalyticsEvent",
    ()=>AnalyticsEvent
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs)");
;
const AnalyticsEventSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["Schema"]({
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true
    },
    meta: {
        type: __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["Schema"].Types.Mixed
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false
});
// TTL: 30 days
AnalyticsEventSchema.index({
    createdAt: 1
}, {
    expireAfterSeconds: 60 * 60 * 24 * 30
});
const AnalyticsEvent = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["models"].AnalyticsEvent || (0, __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["model"])('AnalyticsEvent', AnalyticsEventSchema);
}),
"[project]/lumora/packages/db/CounselingContact.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CounselingContact",
    ()=>CounselingContact
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs)");
;
const CounselingContactSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["Schema"]({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    email: {
        type: String
    },
    hours: {
        type: String
    },
    locationUrl: {
        type: String
    }
}, {
    timestamps: false
});
const CounselingContact = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["models"].CounselingContact || (0, __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["model"])('CounselingContact', CounselingContactSchema);
}),
"[project]/lumora/packages/db/MessageLog.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MessageLog",
    ()=>MessageLog
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs)");
;
const MessageLogSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["Schema"]({
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: [
            'user',
            'assistant'
        ],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false
});
// TTL: 30 days
MessageLogSchema.index({
    createdAt: 1
}, {
    expireAfterSeconds: 60 * 60 * 24 * 30
});
const MessageLog = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["models"].MessageLog || (0, __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["model"])('MessageLog', MessageLogSchema);
}),
"[project]/lumora/packages/db/OutreachAudit.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OutreachAudit",
    ()=>OutreachAudit
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs)");
;
const OutreachAuditSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["Schema"]({
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    consent: {
        type: Boolean,
        required: true
    },
    payloadHash: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false
});
const OutreachAudit = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["models"].OutreachAudit || (0, __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["model"])('OutreachAudit', OutreachAuditSchema);
}),
"[project]/lumora/packages/db/Session.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Session",
    ()=>Session
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs)");
;
const SessionSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["Schema"]({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActiveAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false
});
const Session = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["models"].Session || (0, __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["model"])('Session', SessionSchema);
}),
"[project]/lumora/packages/db/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

// export * from './client';
__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/db/env.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$AnalyticsEvent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/db/AnalyticsEvent.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$CounselingContact$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/db/CounselingContact.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$MessageLog$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/db/MessageLog.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$OutreachAudit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/db/OutreachAudit.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$Session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/db/Session.ts [app-route] (ecmascript)");
;
;
;
;
;
;
}),
"[project]/lumora/packages/core/types.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
}),
"[project]/lumora/packages/core/constants.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DATA_RETENTION_DAYS",
    ()=>DATA_RETENTION_DAYS,
    "RISK_KEYWORDS",
    ()=>RISK_KEYWORDS,
    "SESSION_COOKIE_MAX_AGE",
    ()=>SESSION_COOKIE_MAX_AGE,
    "SESSION_COOKIE_NAME",
    ()=>SESSION_COOKIE_NAME,
    "SYSTEM_PROMPT",
    ()=>SYSTEM_PROMPT
]);
const SYSTEM_PROMPT = `You are Lumora, a supportive mental-health companion.
                              You are not a therapist and do not provide medical diagnoses.
                              Use warm, concise, validating language.
                              When you sense distress, show empathy first, then suggest practical next steps.
                              If risk is high, share self-help tools and campus counseling resources.
                              If asked, offer a consented outreach option.
                              If the user states they are in immediate danger, advise contacting emergency services (911 in the U.S.).
                              Avoid clinical labels; focus on support and safety.
                              Campus Resources (always share when crisis is mentioned):
                              Call 24/7: (657) 278-3040
                              Visit (Mon–Fri, 8 AM–5 PM): Titan Hall, 1st Floor
                              Address: 1111 N. State College Blvd, Titan Hall 1st & 3rd Floor
                              
                              Example 1: Everyday stress
                              User: I’ve been so overwhelmed with classes. It feels like I can’t keep up.
                              Lumora: That sounds really tough. 
                                      It’s okay to feel overwhelmed, many students do. 
                                      Taking things one step at a time can help. 
                                      Would you like me to share some quick ways to manage stress this week?
                              
                              Example 2: Higher distress
                              User: I don’t see the point of anything lately. I just want it all to stop.
                              Lumora: I’m really sorry you’re feeling this way. 
                                      You’re not alone. Talking with someone you trust or your campus counseling center can help. 
                                      If you’re in crisis, please call (657) 278-3040 anytime or visit Titan Hall, 1st Floor (Mon–Fri, 8 AM–5 PM) at 1111 N. State College Blvd. 
                                      If you’re in immediate danger, please call 911 or go to the nearest safe place.

                              Example 3: Non-Crisis Resource Request
                              User: Where can I book a counseling appointment on campus?
                              Lumora: You can call the counseling center at (657) 278-3040 to schedule an appointment. 
                                      They’re also available in person at Titan Hall, 1st Floor (Mon–Fri, 8 AM–5 PM) at 1111 N. State College Blvd. 
                                      Would you like me to share some tips on preparing for your first visit?`;
const RISK_KEYWORDS = {
    RED: [
        "suicide",
        "kill myself",
        "end it all",
        "not worth living",
        "harm myself",
        "hurt myself",
        "self harm",
        "cut myself",
        "overdose",
        "take pills",
        "jump off",
        "hang myself"
    ],
    YELLOW: [
        "depressed",
        "hopeless",
        "worthless",
        "useless",
        "anxiety",
        "panic",
        "overwhelmed",
        "stressed",
        "can't cope",
        "breaking down",
        "falling apart"
    ]
};
const SESSION_COOKIE_NAME = "lumora_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
const DATA_RETENTION_DAYS = 30;
}),
"[project]/lumora/packages/core/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$core$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/core/types.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$core$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/core/constants.ts [app-route] (ecmascript)");
;
;
}),
"[project]/lumora/apps/web/src/app/api/chat/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lumora/packages/db/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/db/env.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$core$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lumora/packages/core/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$core$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/core/constants.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$generative$2d$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@google/generative-ai/dist/index.mjs [app-route] (ecmascript)");
;
;
;
;
;
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
let openaiClient;
let geminiClient;
const getOpenAIClient = ()=>{
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["env"].OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured');
    }
    if (!openaiClient) {
        openaiClient = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
            apiKey: __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["env"].OPENAI_API_KEY
        });
    }
    return openaiClient;
};
const getGeminiClient = ()=>{
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["env"].GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    if (!geminiClient) {
        geminiClient = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$generative$2d$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GoogleGenerativeAI"](__TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["env"].GEMINI_API_KEY);
    }
    return geminiClient;
};
const isProvider = (value)=>value === 'openai' || value === 'gemini';
async function POST(request) {
    try {
        const { sessionId, messages, provider } = await request.json();
        if (!sessionId || !messages?.length) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'invalid_request'
            }, {
                status: 400
            });
        }
        const resolvedProvider = isProvider(provider) ? provider : __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$db$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["env"].AI_PROVIDER;
        let reply;
        if (resolvedProvider === 'gemini') {
            try {
                const model = getGeminiClient().getGenerativeModel({
                    model: DEFAULT_GEMINI_MODEL
                });
                const completion = await model.generateContent({
                    contents: messages.filter((m)=>m.role !== 'system').map((m)=>({
                            role: m.role === 'assistant' ? 'model' : 'user',
                            parts: [
                                {
                                    text: m.content
                                }
                            ]
                        })),
                    systemInstruction: {
                        role: 'system',
                        parts: [
                            {
                                text: __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$core$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SYSTEM_PROMPT"]
                            }
                        ]
                    },
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 400
                    }
                });
                reply = completion.response.text()?.trim();
            } catch (err) {
                console.error('[api/chat] gemini error', err);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'gemini_error'
                }, {
                    status: 500
                });
            }
        } else {
            const convo = [
                {
                    role: 'system',
                    content: __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$core$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SYSTEM_PROMPT"]
                },
                ...messages.map((m)=>({
                        role: m.role,
                        content: m.content
                    }))
            ];
            const completion = await getOpenAIClient().chat.completions.create({
                model: DEFAULT_OPENAI_MODEL,
                messages: convo,
                temperature: 0.7,
                max_tokens: 200
            });
            reply = completion.choices[0]?.message?.content?.trim();
        }
        const safeReply = reply || 'Thank you for sharing. I am here to listen.';
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            reply: safeReply,
            provider: resolvedProvider
        });
    } catch (err) {
        console.error('[api/chat] unexpected error', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'server_error'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__155c7ecd._.js.map