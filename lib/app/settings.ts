import type { Settings, User } from "@prisma/client";

import type { SettingsData } from "@/components/app/settings-view";

// Flatten the User row + optional Settings row into the settings form shape.
export function buildSettingsData(user: User, settings: Settings | null): SettingsData {
  return {
    companyName: user.companyName ?? "",
    address: user.address ?? "",
    zip: user.zip ?? "",
    city: user.city ?? "",
    canton: user.canton ?? "",
    country: user.country ?? "CH",
    iban: user.iban ?? "",
    vatEnabled: user.vatEnabled,
    vatNumber: user.vatNumber ?? "",
    logoUrl: user.logoUrl ?? null,
    defaultCurrency: user.defaultCurrency ?? "CHF",
    paymentTermsDays: user.paymentTermsDays,
    defaultVatRate: user.defaultVatRate,
    defaultDepositPercent: user.defaultDepositPercent,
    quotePrefix: settings?.quotePrefix ?? "DEV",
    invoicePrefix: settings?.invoicePrefix ?? "FAC",
    reminderDay1: settings?.reminderDay1 ?? 3,
    reminderDay2: settings?.reminderDay2 ?? 10,
    reminderDay3: settings?.reminderDay3 ?? 20,
    reminderText1: settings?.reminderText1 ?? "",
    reminderText2: settings?.reminderText2 ?? "",
    reminderText3: settings?.reminderText3 ?? "",
  };
}
