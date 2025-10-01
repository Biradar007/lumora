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
const SYSTEM_PROMPT = `You are Lumora, a supportive mental-health companion. You are not a therapist and do not provide medical diagnoses. Use warm, concise, validating language. When you sense distress, prioritize empathy and practical next steps. If risk is high, present self-help tools and campus counseling resources. Offer a consented outreach option when asked. If the user states they are in immediate danger, advise contacting emergency services. Avoid clinical labels; focus on support and safety.`;
const RISK_KEYWORDS = {
    RED: [
        'suicide',
        'kill myself',
        'end it all',
        'not worth living',
        'harm myself',
        'hurt myself',
        'self harm',
        'cut myself',
        'overdose',
        'take pills',
        'jump off',
        'hang myself'
    ],
    YELLOW: [
        'depressed',
        'hopeless',
        'worthless',
        'useless',
        'anxiety',
        'panic',
        'overwhelmed',
        'stressed',
        'can\'t cope',
        'breaking down',
        'falling apart'
    ]
};
const SESSION_COOKIE_NAME = 'lumora_session';
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
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$core$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lumora/packages/core/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lumora$2f$packages$2f$core$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lumora/packages/core/constants.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
;
;
const openai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
    apiKey: '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'
});
async function POST(request) {
    try {
        const { sessionId, messages } = await request.json();
        if (!sessionId || !messages?.length) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'invalid_request'
            }, {
                status: 400
            });
        }
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
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: convo,
            temperature: 0.7,
            max_tokens: 400
        });
        const reply = completion.choices[0]?.message?.content?.trim() || 'Thank you for sharing. I am here to listen.';
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            reply
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

//# sourceMappingURL=%5Broot-of-the-server%5D__6f46d2d6._.js.map