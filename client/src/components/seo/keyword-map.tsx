import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stateNameToSlug, metroNameToSlug } from "@/lib/slugs";
import { Search } from "lucide-react";

interface KeywordMapItem {
  keyword: string;
  page: string;
  url: string;
  intent: string;
}

export function KeywordPageMap({ states, metros }: { states: any[], metros: any[] }) {
  const keywordMap: KeywordMapItem[] = [
    {
      keyword: "US Housing Market Trends",
      page: "National Dashboard",
      url: "/",
      intent: "Commercial/Informational"
    },
    {
      keyword: "Median Home Value United States",
      page: "National Dashboard",
      url: "/",
      intent: "Informational"
    },
    ...states.slice(0, 10).map(state => ({
      keyword: `${state.name} Housing Market Trends`,
      page: `${state.name} Overview`,
      url: `/state/${stateNameToSlug(state.name)}`,
      intent: "Commercial"
    })),
    ...metros.slice(0, 10).map(metro => ({
      keyword: `${metro.id} Real Estate Forecast`,
      page: `${metro.id} Metro Detail`,
      url: `/metro/${metroNameToSlug(metro.id)}`,
      intent: "Transactional"
    }))
  ];

  return (
    <Card className="mt-12 bg-card/50 border-border/60">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          SEO Keyword → Page Strategy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target Keyword</TableHead>
              <TableHead>Mapped Page</TableHead>
              <TableHead>URL Path</TableHead>
              <TableHead>Search Intent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywordMap.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{item.keyword}</TableCell>
                <TableCell>{item.page}</TableCell>
                <TableCell>
                  <a href={item.url} className="text-primary hover:underline">{item.url}</a>
                </TableCell>
                <TableCell>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full uppercase tracking-tighter">
                    {item.intent}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-4 text-xs text-muted-foreground italic">
          * Dynamic mapping for {states.length} states and {metros.length} metros implemented. Showing top samples.
        </p>
      </CardContent>
    </Card>
  );
}
