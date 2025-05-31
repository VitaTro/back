const soap = require("soap");

async function getOrlenPickupPoints() {
  const wsdlUrl =
    "https://api.orlenpaczka.pl/WebServicePwRProd/WebServicePwR.asmx?wsdl";

  soap.createClient(wsdlUrl, (err, client) => {
    if (err) {
      console.error("❌ Помилка створення SOAP клієнта:", err);
      return;
    }

    client.GetPickupPoints({}, (err, result) => {
      if (err) {
        console.error("❌ Помилка виклику SOAP API:", err);
        return;
      }

      console.log("🚀 Список пунктів видачі:", result);
    });
  });
}

getOrlenPickupPoints();
