export default {
	async fetch(request, env) {
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type"
				}
			})
		}

		const url = new URL(request.url);
		const symbol = url.searchParams.get("symbol");
		const endpoint = url.searchParams.get("endpoint") || "quote";
		const source = url.searchParams.get("source");

		if (!symbol) {
			return jsonError("Missing symbol param", 400);
		}

		if (source === "chart") {
			return await handleStooq(symbol);
		}

		const allowedEndpoints = ["quote", "profile2", "metric"];

		if (!allowedEndpoints.includes(endpoint)) {
			return jsonError("Invalid endpoint", 400);
		}
		
		let finnhubUrl = `https://finnhub.io/api/v1/${endpoint}?symbol=${symbol}&token=${env.FINNHUB_API_KEY}`;
		if (endpoint === "metric") {
			finnhubUrl += "&metric=all";
		}
	
		try {
			const response = await fetch(finnhubUrl);
			const data = await response.json();

			return new Response(JSON.stringify(data), {
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
					"Cache-Control": "public, max-age=60"
				}
			})
			
		} catch (err) {
			return jsonError("Upstream fetch failed", 502);
		}
	},
};

async function handleStooq(symbol) {
	const stooqSymbol = `${symbol.toLowerCase()}.us`;
	const stooqUrl = `https://stooq.com/q/d/l/?s=${stooqSymbol}&i=d`;

  try {
    const response = await fetch(stooqUrl);
    const csvText = await response.text();

    // TEMP: just return exactly what Stooq sent, no parsing
    return new Response(csvText, {
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return jsonError("Stooq fetch failed", 502);
  }
}

function jsonError(message, status) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*"
		}
	})
}