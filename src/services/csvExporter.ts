import { Item, ItemType, Vault, Category } from "../../types";
import EncryptionService from "./encryption";

class CSVExporter {
  private escapeCSV(value: any): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  async exportVaults(vaults: Vault[]): Promise<string> {
    const headers = ["ID", "Name", "Description", "Created", "Items Count"];
    const rows = [headers.join(",")];

    for (const vault of vaults) {
      const row = [
        this.escapeCSV(vault.id),
        this.escapeCSV(vault.name),
        this.escapeCSV(vault.description),
        this.escapeCSV(vault.createdAt),
        this.escapeCSV(vault.itemCount),
      ];
      rows.push(row.join(","));
    }
    return rows.join("\n");
  }

  async exportCategories(categories: Category[]): Promise<string> {
    const headers = ["ID", "Name", "Color"];
    const rows = [headers.join(",")];

    for (const category of categories) {
      const row = [
        this.escapeCSV(category.id),
        this.escapeCSV(category.name),
        this.escapeCSV(category.color),
      ];
      rows.push(row.join(","));
    }
    return rows.join("\n");
  }

  async exportLogins(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "Username",
      "Password",
      "URL",
      "Notes",
      "TOTP Secret",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(data.username),
        this.escapeCSV(data.password),
        this.escapeCSV(data.url),
        this.escapeCSV(item.notes),
        this.escapeCSV(data.totp),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated), // Duplicated column name in original, keeping consistent
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async exportCards(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "Cardholder Name",
      "Card Number",
      "Expiry Month",
      "Expiry Year",
      "CVV",
      "PIN",
      "Notes",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      // Parse expiry if stored as string e.g. "MM/YY" or separate fields
      // Assuming data matches CardData interface
      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(data.holderName),
        this.escapeCSV(data.number),
        this.escapeCSV(data.expiry?.split("/")[0] || ""),
        this.escapeCSV(data.expiry?.split("/")[1] || ""),
        this.escapeCSV(data.cvv),
        this.escapeCSV(data.pin),
        this.escapeCSV(item.notes),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async exportIdentities(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "Full Name",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "Zip",
      "Country",
      "SSN",
      "Passport",
      "License",
      "Notes",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(
          data.firstName
            ? `${data.firstName} ${data.lastName}`
            : data.fullName || ""
        ),
        this.escapeCSV(data.email),
        this.escapeCSV(data.phone),
        this.escapeCSV(data.address1),
        this.escapeCSV(data.city),
        this.escapeCSV(data.state),
        this.escapeCSV(data.postalCode),
        this.escapeCSV(data.country),
        this.escapeCSV(data.passportNumber), // Mapped based on IdentityData interface
        this.escapeCSV(data.passportNumber),
        this.escapeCSV(data.licenseNumber),
        this.escapeCSV(item.notes),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async exportNotes(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "Content",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(data.content || item.notes),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async exportWifi(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "SSID",
      "Password",
      "Security Type",
      "Notes",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(data.ssid),
        this.escapeCSV(data.password),
        this.escapeCSV(data.securityType),
        this.escapeCSV(item.notes),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async exportBankAccounts(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "Bank Name",
      "Account Number",
      "Routing Number",
      "Account Type",
      "IBAN",
      "SWIFT",
      "Notes",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(data.bankName),
        this.escapeCSV(data.accountNumber),
        this.escapeCSV(data.branch), // Using branch as routing number proxy or add field if exists
        this.escapeCSV(data.accountType),
        this.escapeCSV(data.ifsc), // Using IFSC as IBAN storage or local equivalent
        this.escapeCSV(data.swift),
        this.escapeCSV(item.notes),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async exportDatabases(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "Type",
      "Host",
      "Port",
      "Database Name",
      "Username",
      "Password",
      "Connection String",
      "Notes",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(data.dbType),
        this.escapeCSV(data.host),
        this.escapeCSV(data.port),
        this.escapeCSV(data.databaseName),
        this.escapeCSV(data.username),
        this.escapeCSV(data.password),
        this.escapeCSV(""), // Connection string not in interface by default
        this.escapeCSV(item.notes),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async exportServers(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "Host",
      "IP Address",
      "Username",
      "Password",
      "Port",
      "Protocol",
      "Notes",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(data.hostname),
        this.escapeCSV(data.ip),
        this.escapeCSV(data.username),
        this.escapeCSV(data.password),
        this.escapeCSV(""), // Port not explicitly in ServerData interface in types.ts sample
        this.escapeCSV("ssh"), // Protocol default
        this.escapeCSV(item.notes),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async exportSSHKeys(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "Private Key",
      "Public Key",
      "Passphrase",
      "Notes",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(data.privateKey),
        this.escapeCSV(data.publicKey),
        this.escapeCSV(data.passphrase),
        this.escapeCSV(item.notes),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async exportIDCards(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "ID Type",
      "ID Number",
      "Full Name",
      "Issue Date",
      "Expiry Date",
      "Issuing Authority",
      "Notes",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(data.cardTitle),
        this.escapeCSV(data.idName),
        this.escapeCSV(data.fullName),
        this.escapeCSV(""), // Issue date not in interface
        this.escapeCSV(data.validTill),
        this.escapeCSV(""), // Authority not in interface
        this.escapeCSV(item.notes),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async exportFiles(items: Item[]): Promise<string> {
    const headers = [
      "Name",
      "Description",
      "File URL",
      "File Size",
      "File Type",
      "Notes",
      "Vault",
      "Category",
      "Favorite",
      "Created",
      "Updated",
    ];
    const rows = [headers.join(",")];

    for (const item of items) {
      const data = item.data;

      const row = [
        this.escapeCSV(item.name),
        this.escapeCSV(item.notes), // Description proxy
        this.escapeCSV(""), // URL
        this.escapeCSV(""), // Size
        this.escapeCSV(""), // Type
        this.escapeCSV(item.notes),
        this.escapeCSV(item.vaultId),
        this.escapeCSV(item.categoryId),
        this.escapeCSV(item.isFavorite),
        this.escapeCSV(item.lastUpdated),
        this.escapeCSV(item.lastUpdated),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  async parse(csv: string): Promise<any[]> {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]);
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = this.parseCSVLine(lines[i]);
      if (currentLine.length === headers.length) {
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = currentLine[j];
        }
        result.push(obj);
      }
    }
    return result;
  }

  private parseCSVLine(text: string): string[] {
    const result: string[] = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '"') {
        inQuotes = !inQuotes;
      } else if (text[i] === "," && !inQuotes) {
        let val = text.substring(start, i);
        if (val.startsWith('"') && val.endsWith('"'))
          val = val.slice(1, -1).replace(/""/g, '"');
        result.push(val);
        start = i + 1;
      }
    }
    let lastVal = text.substring(start);
    if (lastVal.startsWith('"') && lastVal.endsWith('"'))
      lastVal = lastVal.slice(1, -1).replace(/""/g, '"');
    result.push(lastVal);

    return result;
  }

  async exportByType(items: Item[], type: ItemType): Promise<string> {
    const typeItems = items.filter((item) => item.type === type);

    switch (type) {
      case ItemType.LOGIN:
        return this.exportLogins(typeItems);
      case ItemType.CARD:
        return this.exportCards(typeItems);
      case ItemType.IDENTITY:
        return this.exportIdentities(typeItems);
      case ItemType.NOTE:
        return this.exportNotes(typeItems);
      case ItemType.WIFI:
        return this.exportWifi(typeItems);
      case ItemType.BANK:
        return this.exportBankAccounts(typeItems);
      case ItemType.DATABASE:
        return this.exportDatabases(typeItems);
      case ItemType.SERVER:
        return this.exportServers(typeItems);
      case ItemType.SSH_KEY:
        return this.exportSSHKeys(typeItems);
      case ItemType.ID_CARD:
        return this.exportIDCards(typeItems);
      case ItemType.FILE:
        return this.exportFiles(typeItems);
      default:
        return "";
    }
  }
}

export default new CSVExporter();
