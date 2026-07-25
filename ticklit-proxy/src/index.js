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

		if (!symbol) {
			return jsonError("Missing symbol param", 400);
		}

		const allowedEndpoints = ["quote", "profile2", "metric"];

		if (!allowedEndpoints.includes(endpoint)) {
			return new Response(JSON.stringify({
				error: "Invalid endpoint"
			}), {
				status: 400,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*"
				}
			})
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

	async function handleStooq(symbol) {
		return;
	}
};
