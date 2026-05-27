'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useGrocerySettings, useUpdateGrocerySettings } from '../../hooks/use-grocery-deals'
import { KeywordManager } from '../../components/keyword-manager'

export default function GroceryDealsSettingsPage() {
  const { toast } = useToast()
  const { data: settings } = useGrocerySettings()
  const updateSettings = useUpdateGrocerySettings()

  const [postalCode, setPostalCode] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydrated = useRef(false)

  useEffect(() => {
    if (settings && !hydrated.current) {
      setPostalCode(settings.postalCode ?? '')
      hydrated.current = true
    }
  }, [settings])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const handleSavePostalCode = () => {
    const trimmed = postalCode.trim()
    if (!trimmed) return

    updateSettings.mutate(
      { postalCode: trimmed },
      {
        onSuccess: () => {
          setJustSaved(true)
          toast({ title: 'Postal code saved' })
          timer.current = setTimeout(() => setJustSaved(false), 1500)
        },
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
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-4xl font-medium">Grocery Deals Settings</h1>

      {/* Postal Code */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>Used to find deals near you from Flipp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="postalCode">Postal / ZIP Code</Label>
            <div className="flex gap-2">
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. M5V 3A8"
                maxLength={10}
                disabled={updateSettings.isPending}
                className="max-w-48"
              />
              <Button
                onClick={handleSavePostalCode}
                disabled={updateSettings.isPending || justSaved || !postalCode.trim()}
              >
                {updateSettings.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : justSaved ? (
                  <><CheckCircle2 className="w-4 h-4 mr-1 text-green-600" /> Saved</>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Keyword Watchlist</CardTitle>
          <CardDescription>
            Deals are searched for each keyword when you refresh. Max 20 keywords.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KeywordManager />
        </CardContent>
      </Card>
    </div>
  )
}
