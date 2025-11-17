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
    const trimmedQuery = query.trim();
    
    // Check if it's a pure number (with optional decimal)
    const isNumber = /^\d+\.?\d*$/.test(trimmedQuery);
    
    if (isNumber) {
      // Search by exact amount
      result.amountOperator = '=';
      result.amountValue = parseFloat(trimmedQuery);
    } else {
      // Search by text in note
      result.textQuery = trimmedQuery.toLowerCase();
    }
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

    // Apply text filter on note field or amount as string
    if (searchQuery.textQuery) {
      const noteMatch = transaction.note.toLowerCase().includes(searchQuery.textQuery);
      const amountString = transaction.amount.toString();
      const amountMatch = amountString.includes(searchQuery.textQuery);
      if (!noteMatch && !amountMatch) return false;
    }

    // Apply category filter
    if (searchQuery.category && searchQuery.category !== 'all') {
      if (transaction.category !== searchQuery.category) return false;
    }

    return true;
  });
}
