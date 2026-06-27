import { describe, it, expect } from "vitest";
import { validateColecta, validateAccount, validateDonacion } from "@/lib/colectas";

describe("validateColecta", () => {
  const ok = {
    title: "Ayuda Petare",
    adminName: "Ana Diaz",
    adminCedula: "V-12.345.678",
    adminEmail: "ana@example.com",
    goalAmount: "1000",
    currency: "Bs",
  };
  it("accepts a complete colecta and normalizes cédula + goal", () => {
    const r = validateColecta(ok);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.adminCedula).toBe("V12345678");
      expect(r.value.goalAmount).toBe(1000);
      expect(r.value.currency).toBe("Bs");
    }
  });
  it("requires title and admin name/cédula/email", () => {
    const r = validateColecta({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.title).toBeTruthy();
      expect(r.errors.adminName).toBeTruthy();
      expect(r.errors.adminCedula).toBeTruthy();
      expect(r.errors.adminEmail).toBeTruthy();
    }
  });
  it("rejects a bad email and an invalid cédula", () => {
    expect(validateColecta({ ...ok, adminEmail: "nope" }).ok).toBe(false);
    expect(validateColecta({ ...ok, adminCedula: "123" }).ok).toBe(false);
  });
  it("allows no goal", () => {
    const r = validateColecta({ ...ok, goalAmount: "" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.goalAmount).toBeNull();
  });
});

describe("validateAccount", () => {
  it("pago_movil requires phone, bank, cédula", () => {
    expect(
      validateAccount({ method: "pago_movil", phone: "04141234567", bankEntity: "Banesco", cedula: "V12345678" }).ok
    ).toBe(true);
    expect(validateAccount({ method: "pago_movil", phone: "", bankEntity: "", cedula: "" }).ok).toBe(false);
  });
  it("zelle/bizum require a valid email + owner", () => {
    expect(validateAccount({ method: "zelle", email: "a@b.com", ownerName: "Ana" }).ok).toBe(true);
    expect(validateAccount({ method: "bizum", email: "bad", ownerName: "" }).ok).toBe(false);
  });
  it("rejects an unknown method", () => {
    expect(validateAccount({ method: "paypal", email: "a@b.com", ownerName: "Ana" }).ok).toBe(false);
  });
});

describe("validateDonacion", () => {
  it("requires a positive amount and a proof", () => {
    expect(validateDonacion({ amount: "50", currency: "Bs", hasProof: true }).ok).toBe(true);
    expect(validateDonacion({ amount: "50", currency: "Bs", hasProof: false }).ok).toBe(false);
    expect(validateDonacion({ amount: "0", currency: "Bs", hasProof: true }).ok).toBe(false);
  });
  it("keeps optional donor name and account", () => {
    const r = validateDonacion({ amount: "10", currency: "USD", donorName: "Luis", accountId: "acc-1", hasProof: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.donorName).toBe("Luis");
      expect(r.value.accountId).toBe("acc-1");
      expect(r.value.currency).toBe("USD");
    }
  });
});
