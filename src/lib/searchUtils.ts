import { Transaction } from "@/types/transaction";

export interface SearchQuery {
  textQuery?: string;
  amountOperator?: '<' | '>' | '<=' | '>=' | '=';
  amountValue?: number;
  category?: string;
}

export function parseSearchQuery(query: string): SearchQuery {
  const result: SearchQuery = {};
  
  if (!query.trim()) return result;

  // Check for amount operators: >=, <=, >, <, =
  const operatorMatch = query.match(/^(>=|<=|>|<|=)\s*(\d+\.?\d*)/);
  
  if (operatorMatch) {
    result.amountOperator = operatorMatch[1] as SearchQuery['amountOperator'];
    result.amountValue = parseFloat(operatorMatch[2]);
    
    // Get remaining text after the operator
    const remainingText = query.replace(operatorMatch[0], '').trim();
    if (remainingText) {
      result.textQuery = remainingText.toLowerCase();
    }
  } else {
    // No operator found, treat as text search
    result.textQuery = query.trim().toLowerCase();
  }
  
  return result;
}

export function filterTransactionsBySearch(
  transactions: Transaction[],
  searchQuery: SearchQuery
): Transaction[] {
  if (!searchQuery.textQuery && !searchQuery.amountOperator && !searchQuery.category) {
    return transactions;
  }

  return transactions.filter(transaction => {
    // Apply amount filter
    if (searchQuery.amountOperator && searchQuery.amountValue !== undefined) {
      const amount = transaction.amount;
      switch (searchQuery.amountOperator) {
        case '>':
          if (amount <= searchQuery.amountValue) return false;
          break;
        case '<':
          if (amount >= searchQuery.amountValue) return false;
          break;
        case '>=':
          if (amount < searchQuery.amountValue) return false;
          break;
        case '<=':
          if (amount > searchQuery.amountValue) return false;
          break;
        case '=':
          if (amount !== searchQuery.amountValue) return false;
          break;
      }
    }

    // Apply text filter on note field
    if (searchQuery.textQuery) {
      const noteMatch = transaction.note.toLowerCase().includes(searchQuery.textQuery);
      if (!noteMatch) return false;
    }

    // Apply category filter
    if (searchQuery.category && searchQuery.category !== 'all') {
      if (transaction.category !== searchQuery.category) return false;
    }

    return true;
  });
}
