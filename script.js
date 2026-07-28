const WORKER_URL = "https://ticklit-proxy.sodanhama.workers.dev";

const TERM_DEFINITIONS = {
  peRatio: {
    label: "P/E Ratio",
    explain: "How many dollars investors are paying for every $1 of Apple's yearly profit. A higher number means people expect strong future growth (or the stock may be overpriced).",
    format: (v) => v.toFixed(2),
  },
  eps: {
    label: "EPS (Earnings Per Share)",
    explain: "Apple's total profit divided by the number of shares that exist. It's how much profit 'belongs' to a single share.",
    format: (v) => `$${v.toFixed(2)}`,
  },
  dividendYield: {
    label: "Dividend Yield",
    explain: "The yearly cash payout Apple gives shareholders, shown as a percentage of the stock price — like a cash-back rate for holding the stock.",
    format: (v) => `${v.toFixed(2)}%`,
  },
  beta: {
    label: "Beta",
    explain: "How much Apple's price swings compared to the overall market. 1.0 means it moves in line with the market; higher means more volatile.",
    format: (v) => v.toFixed(2),
  },
  week52High: {
    label: "52-Week High",
    explain: "The highest price Apple's stock has hit in the past year.",
    format: (v) => `$${v.toFixed(2)}`,
  },
  week52Low: {
    label: "52-Week Low",
    explain: "The lowest price Apple's stock has hit in the past year.",
    format: (v) => `$${v.toFixed(2)}`,
  },
  marketCap: {
    label: "Market Cap",
    explain: "The total value of the entire company, according to the stock market: price per share × total shares that exist.",
    format: (v) => `$${(v / 1000).toFixed(1)}B`,
  },
  roe: {
    label: "ROE (Return on Equity)",
    explain: "How efficiently Apple turns shareholder money into profit. Apple's ROE looks unusually high (100%+) because years of stock buybacks have shrunk its 'shareholder equity' — this isn't a red flag, it's a side effect of Apple's specific strategy. Most companies sit closer to 15-20%.",
    format: (v) => `${v.toFixed(2)}%`,
  },
};

async function initChart() {
    const container = document.getElementById("chart-container");

    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 400,
        layout: {
            background: {color: '#222222'},
            textColor: '#c7c7c7',
        },
        grid: {
            vertLines: {color: '#222222'},
            horzLines: {color: '#222222'},
        },
        rightPriceScale: {
            borderColor: '#A6B1E1',
        },
        timeScale: {
            borderColor: '#A6B1E1',
        },
    })

    const lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
    color: '#424874',
    lineWidth: 2,
    });

    const response = await fetch(`${WORKER_URL}/?symbol=AAPL&source=chart`);
    const data = await response.json();

    const chartData = data.map((day)=> ({
        time: day.date,
        value: day.close,
    }))

    lineSeries.setData(chartData);
}

initChart();

async function initTermGrid() {
    const grid = document.getElementById("term-grid");

    const response = await fetch(`${WORKER_URL}/?symbol=AAPL&endpoint=metric`);
    const metrics = await response.json();

    Object.keys(TERM_DEFINITIONS).forEach((key) => {
        const def = TERM_DEFINITIONS[key];
        const rawValue = metrics[key];

        if (rawValue == null || rawValue === undefined) return;
        
        const card = document.createElement("div");
        card.className = "term-card";

        card.innerHTML = `
        <div class="term-value">${def.format(rawValue)}</div>
        <div class="term-label">${def.label}</div>
        <div class="term-explain">${def.explain}</div>
        `

        grid.appendChild(card);
    })
}

initTermGrid();