'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useUpdateGrocerySettings } from '../hooks/use-grocery-deals'

export function PostalCodePrompt() {
  const { toast } = useToast()
  const updateSettings = useUpdateGrocerySettings()
  const [postalCode, setPostalCode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const trimmed = postalCode.trim()
    if (trimmed.length < 3) {
      setError('Please enter a valid postal or ZIP code.')
      return
    }
    setError('')

    updateSettings.mutate(
      { postalCode: trimmed, onboardingCompleted: true },
      {
        onError: (err) => {
          toast({
            variant: 'destructive',
            title: 'Failed to save',
            description: err instanceof Error ? err.message : 'Please try again.',
          })
        },
      }
    )
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Daily Grocery Deals</CardTitle>
          <CardDescription>
            Enter your postal or ZIP code so we can find deals near you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="postalCode">Postal / ZIP Code</Label>
            <Input
              id="postalCode"
              value={postalCode}
              onChange={(e) => { setPostalCode(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. M5V 3A8"
              maxLength={10}
              disabled={updateSettings.isPending}
              aria-invalid={!!error}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={updateSettings.isPending || !postalCode.trim()}
          >
            {updateSettings.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
            ) : updateSettings.isSuccess ? (
              <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Done!</>
            ) : (
              'Get Started'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
