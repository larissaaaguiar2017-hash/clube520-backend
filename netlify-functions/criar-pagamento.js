// netlify-functions/criar-pagamento.js

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido" };
  }

  try {
    // Import dinâmico de fetch para compatibilidade total
    const fetch = (await import("node-fetch")).default;

    // Verifica se a variável ASAAS_KEY existe
    if (!process.env.ASAAS_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Chave ASAAS_KEY ausente. Configure em Environment Variables no Netlify."
        })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { nome, email, cpf, telefone, valor, plano } = body;

    if (!nome || !email || !valor) {
      return { statusCode: 400, body: "Campos obrigatórios ausentes" };
    }

    // Criar cliente no Asaas
    const clienteResp = await fetch("https://www.asaas.com/api/v3/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": process.env.ASAAS_KEY
      },
      body: JSON.stringify({
        name: nome,
        email,
        cpfCnpj: cpf || "",
        phone: telefone || ""
      })
    });

    const cliente = await clienteResp.json();
    if (!cliente.id) {
      console.error("Erro cliente:", cliente);
      return { statusCode: 500, body: JSON.stringify(cliente) };
    }

    // Criar cobrança PIX
    const pagamentoResp = await fetch("https://www.asaas.com/api/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": process.env.ASAAS_KEY
      },
      body: JSON.stringify({
        customer: cliente.id,
        billingType: "PIX",
        value: Number(valor),
        dueDate: new Date().toISOString().split("T")[0],
        description: `Assinatura Clube 520 - ${plano || ""}`
      })
    });

    const pagamento = await pagamentoResp.json();
    if (!pagamento.invoiceUrl) {
      console.error("Erro pagamento:", pagamento);
      return { statusCode: 500, body: JSON.stringify(pagamento) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "ok",
        invoiceUrl: pagamento.invoiceUrl
      })
    };
  } catch (err) {
    console.error("Erro geral:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err.message || err) })
    };
  }
}
