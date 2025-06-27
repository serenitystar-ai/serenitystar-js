import { SerenityClient } from "@serenity-star/sdk";
import { setupDynamicHandler } from "./utils";

const client = new SerenityClient({
  apiKey: import.meta.env.VITE_SERENITY_API_KEY,
  baseUrl: import.meta.env.VITE_SERENITY_BASE_URL,
});

const curryBioToSummarize = "Wardell Stephen Curry II (/ˈstɛfən/ STEF-ən;[1] born March 14, 1988) is an American professional basketball player and point guard for the Golden State Warriors of the National Basketball Association (NBA). Widely considered the greatest shooter of all time,[2][3] Curry is credited with revolutionizing the sport by inspiring teams and players at all levels to more prominently utilize the three-point shot.[4][5][6][7] He is a four-time NBA champion, a two-time NBA Most Valuable Player (MVP), an NBA Finals MVP, and a two-time NBA All-Star Game MVP. He is also a two-time NBA scoring champion, an eleven-time NBA All-Star, and a ten-time All-NBA Team selection (including four on the First Team). Internationally, he has won two gold medals at the FIBA World Cup and a gold medal at the 2024 Summer Olympics as part of the U.S. national team.Curry played collegiately for the Davidson Wildcats, where he was named Conference Player of the Year twice, and set the NCAA single-season record for three-pointers made (162) during his sophomore year. Curry was selected by the Warriors as the seventh overall pick in the 2009 NBA draft.In 2014–15, Curry won his first league MVP award and led the Warriors to their first championship since 1975. The following season, he became the first player to be elected MVP by a unanimous vote and lead the league in scoring while shooting above 50–40–90. That same year, the Warriors broke the record for the most wins in a regular season in NBA history (73) en route to the 2016 NBA Finals, which they lost to the Cleveland Cavaliers in Game 7. Curry helped the Warriors win back-to-back titles in 2017 and 2018, and reach the 2019 NBA Finals, losing to the Toronto Raptors in six games. Following injury struggles and missed playoff appearances in 2020 and 2021, Curry won his fourth championship with the Warriors and first Finals MVP award, defeating the Boston Celtics in the 2022 NBA Finals. The same season, he became the all-time leader in three-pointers made in NBA history, surpassing Ray Allen.[8]"

// Text Summarizer Activity without SSE
setupDynamicHandler("start-normal-activity", async () => {
  try {
    const response = await client.agents.activities.execute("text-summarizer", {
      inputParameters: {
        "text_to_summarize": curryBioToSummarize
      }
    });
    console.log("Response:", response);
    document.getElementById("normal-response-activity").textContent =
      response.content;
  } catch (error) {
    console.error("Error:", error);
  }
});


// Text Summarizer Activity with SSE
setupDynamicHandler("start-sse-activity", async () => {
  try {
    const responseElement = document.getElementById("sse-response-activity");
    const activity = client.agents.activities
      .create("text-summarizer", {
        inputParameters: {
          "text_to_summarize": curryBioToSummarize,
        }
      })
      .on("start", () => {
        responseElement.textContent = "";
      })
      .on("content", (chunk) => {
        responseElement.textContent += chunk;
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await activity.stream();
  } catch (error) {
    console.error("Error:", error);
  }
});

// Cooking Activity Demo without SSE
setupDynamicHandler("start-normal-cooking", async () => {
  try {
    const response = await client.agents.activities.execute(
      "cooking-activity",
      {
        inputParameters: {
          ingredientOne: "chicken",
          ingredientTwo: "onion",
          ingredientThree: "cream",
        },
      }
    );
    console.log("Response:", response);
    document.getElementById("normal-response-cooking").textContent =
      response.content;
  } catch (error) {
    console.error("Error:", error);
  }
});

// Cooking Activity Demo with SSE
setupDynamicHandler("start-sse-cooking", async () => {
  try {
    const responseElement = document.getElementById("sse-response-cooking");
    const activity = client.agents.activities
      .create("cooking-activity", {
        inputParameters: {
          ingredientOne: "chicken",
          ingredientTwo: "onion",
          ingredientThree: "cream",
        },
      })
      .on("start", () => {
        responseElement.textContent = "";
      })
      .on("content", (chunk) => {
        responseElement.textContent += chunk;
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await activity.stream();
  } catch (error) {
    console.error("Error:", error);
  }
});

// Chat Completion Cooking Demo without SSE
setupDynamicHandler("start-normal-chat", async () => {
  try {
    const response = await client.agents.chatCompletions.execute(
      "cooking-chat",
      {
        message: "How do I cook a parmesan chicken?",
      }
    );
    console.log("Response:", response);
    document.getElementById("normal-response-chat").textContent =
      response.content;
  } catch (error) {
    console.error("Error:", error);
  }
});

// Chat Completion Cooking Demo with SSE
setupDynamicHandler("start-sse-chat", async () => {
  try {
    const responseElement = document.getElementById("sse-response-chat");
    const chatCompletion = client.agents.chatCompletions
      .create("cooking-chat", {
        message: "How do I cook a parmesan chicken?",
      })
      .on("start", () => {
        responseElement.textContent = "";
      })
      .on("content", (chunk) => {
        responseElement.textContent += chunk;
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await chatCompletion.stream();
  } catch (error) {
    console.error("Error:", error);
  }
});



// Proxy Demo without SSE
setupDynamicHandler("start-normal-proxy", async () => {
  try {
    const response = await client.agents.proxies.execute("proxy-agent", {
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Always use short and concise responses",
        },
        { role: "user", content: "What is artificial intelligence?" },
      ],
      temperature: 1,
      max_tokens: 250,
    });
    console.log("Response:", response);
    document.getElementById("normal-response-proxy").textContent =
      response.content;
  } catch (error) {
    console.error("Error:", error);
  }
});

// Proxy Demo with SSE
setupDynamicHandler("start-sse-proxy", async () => {
  try {
    const responseElement = document.getElementById("sse-response-proxy");
    const proxy = client.agents.proxies
      .create("proxy-agent", {
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          { role: "user", content: "What is artificial intelligence?" },
        ],
        temperature: 1,
        max_tokens: 250,
      })
      .on("start", () => {
        responseElement.textContent = "";
      })
      .on("content", (chunk) => {
        responseElement.textContent += chunk;
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await proxy.stream();
  } catch (error) {
    console.error("Error:", error);
  }
});

// Plan Demo without SSE
setupDynamicHandler("start-normal-plan", async () => {
  try {
    const response = await client.agents.plans.execute("event-planner");
    console.log("Response:", response);
    document.getElementById("normal-response-plan").textContent =
      response.content;
  } catch (error) {
    console.error("Error:", error);
  }
});

// Plan Demo with SSE
setupDynamicHandler("start-sse-plan", async () => {
  try {
    const responseElement = document.getElementById("sse-response-plan");
    const plan = client.agents.plans
      .create("event-planner")
      .on("start", () => {
        responseElement.textContent = "";
      })
      .on("content", (chunk) => {
        responseElement.textContent += chunk;
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await plan.stream();
  } catch (error) {
    console.error("Error:", error);
  }
});
