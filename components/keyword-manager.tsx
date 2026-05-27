'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useGroceryKeywords, useAddKeyword, useRemoveKeyword } from '../hooks/use-grocery-deals'

export function KeywordManager() {
  const { toast } = useToast()
  const { data: keywords = [], isLoading } = useGroceryKeywords()
  const addKeyword = useAddKeyword()
  const removeKeyword = useRemoveKeyword()

  const [input, setInput] = useState('')

  const handleAdd = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (keywords.length >= 20) {
      toast({ variant: 'destructive', title: 'Maximum 20 keywords allowed' })
      return
    }

    addKeyword.mutate(trimmed, {
      onSuccess: () => setInput(''),
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Failed to add keyword',
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      },
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. chicken, eggs, milk..."
          maxLength={100}
          disabled={addKeyword.isPending}
          className="flex-1"
        />
        <Button
          onClick={handleAdd}
          disabled={addKeyword.isPending || !input.trim() || keywords.length >= 20}
          size="sm"
        >
          {addKeyword.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><Plus className="w-4 h-4 mr-1" /> Add</>
          )}
        </Button>
      </div>

      {/* Keyword pills */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading keywords...</p>
      ) : keywords.length === 0 ? (
        <p className="text-sm text-muted-foreground">No keywords yet. Add one above.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <Badge key={kw.id} variant="secondary" className="flex items-center gap-1 pr-1 text-sm">
              {kw.keyword}
              <button
                onClick={() => removeKeyword.mutate(kw.id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
                aria-label={`Remove ${kw.keyword}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{keywords.length}/20 keywords</p>
    </div>
  )
}
