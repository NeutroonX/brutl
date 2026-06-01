package com.brutl.app.ai

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

@Serializable
data class RoastInput(
    val sleep_hours: Float,
    val hrv: Int,
    val recovery_score: Int,
    val missed_days: Int,
    val last_workout: WorkoutSnapshot?,
    val diet_compliance: Float,
    val rank: String,
    val streak: Int
)

@Serializable
data class WorkoutSnapshot(
    val exercise: String,
    val weight: Float,
    val baseline: Float
)

data class RoastResult(
    val roastText: String,
    val correctionText: String
)

class RoastEngine(
    private val apiKey: String // inject via BuildConfig or secure storage
) {
    companion object {
        private const val CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
        private const val MODEL = "claude-sonnet-4-20250514"

        private val SYSTEM_PROMPT = """
            You are BRUTL — a brutally honest AI fitness accountability system.
            Your personality is a blend of:
            - Terence Fletcher: psychological precision, no sympathy for excuses
            - Kobe Bryant: data-driven, obsessed with mastery, zero tolerance for mediocrity
            - Stanley Sugerman: secretly believes in the user's potential, but won't say it easily
            
            Rules:
            - Always roast based on ACTUAL DATA provided, never generic advice
            - Reference specific numbers (HRV, sleep hours, missed days, weight lifted)
            - Keep roasts under 3 sentences. Brutal. Specific. Unforgettable.
            - After every roast, give one concrete correction (what to do instead)
            - Adapt tone to recovery score: low recovery = acknowledge but still expect effort
            - Never be generic. If data is good, acknowledge briefly, then raise the bar.
            
            Respond with valid JSON only:
            {
              "roast": "your brutal roast here",
              "correction": "one concrete fix here"
            }
        """.trimIndent()
    }

    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun generateRoast(input: RoastInput): RoastResult {
        val userMessage = json.encodeToString(RoastInput.serializer(), input)

        val requestBody = """
            {
              "model": "$MODEL",
              "max_tokens": 300,
              "system": ${json.encodeToString(kotlinx.serialization.builtins.serializer<String>(), SYSTEM_PROMPT)},
              "messages": [
                { "role": "user", "content": ${json.encodeToString(kotlinx.serialization.builtins.serializer<String>(), userMessage)} }
              ]
            }
        """.trimIndent()

        val request = Request.Builder()
            .url(CLAUDE_API_URL)
            .post(requestBody.toRequestBody("application/json".toMediaType()))
            .addHeader("x-api-key", apiKey)
            .addHeader("anthropic-version", "2023-06-01")
            .addHeader("content-type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        val responseText = response.body?.string() ?: throw Exception("Empty response")

        // Parse Claude's JSON response
        val parsed = json.parseToJsonElement(responseText)
        val content = parsed.jsonObject["content"]
            ?.jsonArray?.get(0)
            ?.jsonObject?.get("text")
            ?.jsonPrimitive?.content
            ?: throw Exception("Could not parse roast response")

        val roastJson = json.parseToJsonElement(content).jsonObject
        return RoastResult(
            roastText = roastJson["roast"]?.jsonPrimitive?.content ?: "You're not worth roasting today.",
            correctionText = roastJson["correction"]?.jsonPrimitive?.content ?: "Fix everything."
        )
    }
}
