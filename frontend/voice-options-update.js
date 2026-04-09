// ═══════════════════════════════════════════
// VOICE OPTIONS FOR D-ID (Microsoft Azure Voices)
// Replace your existing updateVoiceOptions() function with this
// ═══════════════════════════════════════════

window.updateVoiceOptions = function () {
    const lang = document.getElementById("language").value;
    const voiceSelect = document.getElementById("voiceModel");
    
    voiceSelect.innerHTML = "";
    
    let voices = [];
    
    if (lang === "English") {
        voices = [
            { id: "en-US-JennyNeural", name: "🇺🇸 Jenny (Female, Friendly & Warm)" },
            { id: "en-US-GuyNeural", name: "🇺🇸 Guy (Male, Professional)" },
            { id: "en-US-AriaNeural", name: "🇺🇸 Aria (Female, Conversational)" },
            { id: "en-US-DavisNeural", name: "🇺🇸 Davis (Male, Natural)" },
            { id: "en-US-JaneNeural", name: "🇺🇸 Jane (Female, Clear)" },
            { id: "en-US-JasonNeural", name: "🇺🇸 Jason (Male, Energetic)" },
            { id: "en-GB-SoniaNeural", name: "🇬🇧 Sonia (Female, British)" },
            { id: "en-GB-RyanNeural", name: "🇬🇧 Ryan (Male, British)" },
            { id: "en-AU-NatashaNeural", name: "🇦🇺 Natasha (Female, Australian)" },
            { id: "en-AU-WilliamNeural", name: "🇦🇺 William (Male, Australian)" }
        ];
    } else if (lang === "Tamil") {
        voices = [
            { id: "ta-IN-PallaviNeural", name: "🇮🇳 பல்லவி (Pallavi - Female)" },
            { id: "ta-IN-ValluvarNeural", name: "🇮🇳 வள்ளுவர் (Valluvar - Male)" }
        ];
    }
    
    voices.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.text = v.name;
        voiceSelect.add(opt);
    });
};

// Initialize voice options on page load
updateVoiceOptions();

// ═══════════════════════════════════════════
// ADDITIONAL VOICE OPTIONS (Optional - Add more languages)
// ═══════════════════════════════════════════

/*
// If you want to add more languages, modify the HTML select first:
<select id="language" onchange="updateVoiceOptions()">
    <option value="English">English</option>
    <option value="Tamil">Tamil (தமிழ்)</option>
    <option value="Hindi">Hindi (हिंदी)</option>
    <option value="Spanish">Spanish (Español)</option>
    <option value="French">French (Français)</option>
</select>

// Then add these cases to updateVoiceOptions():

    } else if (lang === "Hindi") {
        voices = [
            { id: "hi-IN-SwaraNeural", name: "🇮🇳 Swara (Female)" },
            { id: "hi-IN-MadhurNeural", name: "🇮🇳 Madhur (Male)" }
        ];
    } else if (lang === "Spanish") {
        voices = [
            { id: "es-ES-ElviraNeural", name: "🇪🇸 Elvira (Female)" },
            { id: "es-ES-AlvaroNeural", name: "🇪🇸 Alvaro (Male)" },
            { id: "es-MX-DaliaNeural", name: "🇲🇽 Dalia (Female, Mexican)" }
        ];
    } else if (lang === "French") {
        voices = [
            { id: "fr-FR-DeniseNeural", name: "🇫🇷 Denise (Female)" },
            { id: "fr-FR-HenriNeural", name: "🇫🇷 Henri (Male)" }
        ];
    }
*/