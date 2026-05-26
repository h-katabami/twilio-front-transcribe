import { env } from "./useEnv";

type CompaniesResponse = {
  results?: Array<{
    company_name?: string;
    SK?: string;
  }>;
};

function mapCompanyDtoToName(item: { company_name?: string; SK?: string }): string {
  const fromName = String(item.company_name ?? "").trim();
  if (fromName) {
    return fromName;
  }

  const sk = String(item.SK ?? "").trim();
  return sk.startsWith("CompanyName#") ? sk.split("#", 2)[1] || "" : "";
}

export function useApiCommon() {
  const fetchCompanies = async (token: string | null): Promise<string[]> => {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${env.apiBaseUrl}/edit/companies`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as CompaniesResponse;
    const results = Array.isArray(data.results) ? data.results : [];

    const names = results.map(mapCompanyDtoToName).filter(Boolean);

    return [...new Set(names)].sort();
  };

  return {
    fetchCompanies,
  };
}