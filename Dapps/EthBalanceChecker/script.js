let ethPrice = 0;

document.getElementById("csvFileInput").addEventListener("change", (event) => {
  document.getElementById("processButton").disabled =
    event.target.files.length === 0;
});

async function processAddresses() {
  const processButton = document.getElementById("processButton");
  processButton.disabled = true;

  const provider = new ethers.providers.EtherscanProvider();
  const csvFileInput = document.getElementById("csvFileInput");
  const file = csvFileInput.files[0];
  const reader = new FileReader();

  reader.onload = async (event) => {
    const text = event.target.result;
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const outputLines = ["address,balance,balance_in_usd"];
    const addressIndex = lines[0].split(",").indexOf("address");

    if (addressIndex === -1) {
      log("Error: No 'address' column found in the CSV file.", "error");
      return;
    }

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(",");
      const address = columns[addressIndex].trim();
      try {
        const balance = await provider.getBalance(address);
        const etherString = ethers.utils.formatEther(balance);
        const balanceInUsd = (parseFloat(etherString) * ethPrice).toFixed(2);
        outputLines.push(`${address},${etherString},${balanceInUsd}`);
        log(
          `<br>Address: ${address}<br>Balance: ${etherString} ETH<br>Balance in USD: $${balanceInUsd}`,
          "info"
        );
      } catch (error) {
        outputLines.push(`${address},INVALID,INVALID`);
        log(`Invalid address: ${address}`, "error");
      }
    }

    downloadOutputCsv(outputLines.join("\n"));
    log("Processing complete.", "success");
    processButton.disabled = false;
  };

  reader.readAsText(file);
}

function log(message, type) {
  const logDiv = document.getElementById("log");
  const timestamp = new Date().toISOString();
  logDiv.innerHTML += `<p class="log-message log-${type}">[${timestamp}] ${message}</p>`;
  logDiv.scrollTop = logDiv.scrollHeight;
  document.getElementById("clearLogButton").disabled = false;
}

function downloadOutputCsv(outputCsv) {
  const blob = new Blob([outputCsv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.getElementById("downloadLink");
  downloadLink.href = url;
  downloadLink.download = "output.csv";
  downloadLink.style.display = "block";
}

function clearLogs() {
  document.getElementById("log").innerHTML = "";
  document.getElementById("clearLogButton").disabled = true;
}

async function fetchEthPrice() {
  const storedData = localStorage.getItem("ethPriceData");
  const now = new Date();

  if (storedData) {
    const ethPriceData = JSON.parse(storedData);
    const lastFetchTime = new Date(ethPriceData.timestamp);
    if (now - lastFetchTime < 3600000) {
      // One hour
      ethPrice = ethPriceData.price;
      document.getElementById(
        "ethPrice"
      ).innerText = `Current ETH Price: $${ethPrice}`;
      return;
    }
  }

  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const data = await response.json();
  ethPrice = data.ethereum.usd;
  document.getElementById(
    "ethPrice"
  ).innerText = `Current ETH Price: $${ethPrice}`;
  localStorage.setItem(
    "ethPriceData",
    JSON.stringify({ price: ethPrice, timestamp: now })
  );
}

window.onload = function () {
  fetchEthPrice();
  document.getElementById("csvFileInput").value = "";
  document.getElementById("processButton").disabled = true;
  document.getElementById("clearLogButton").disabled = true;
  document.getElementById("downloadLink").disabled = true;
};
