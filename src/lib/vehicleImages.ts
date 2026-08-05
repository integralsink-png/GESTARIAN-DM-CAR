import { supabase } from './supabase'

export interface VehicleImage {
  id: string
  matricula: string
  image_data: string
  created_at: string
}

export async function fetchVehicleImages(matricula: string): Promise<VehicleImage[]> {
  const { data, error } = await supabase
    .from('vehicle_images')
    .select('*')
    .eq('matricula', matricula.toUpperCase().replace(/\s/g, ''))
    .order('created_at', { ascending: true })
  if (error) return []
  return (data ?? []) as VehicleImage[]
}

export async function addVehicleImage(matricula: string, imageData: string): Promise<VehicleImage | null> {
  const cleanPlate = matricula.toUpperCase().replace(/\s/g, '')
  const { data, error } = await supabase
    .from('vehicle_images')
    .insert({ matricula: cleanPlate, image_data: imageData })
    .select()
    .maybeSingle()
  if (error || !data) return null
  return data as VehicleImage
}

export async function deleteVehicleImage(id: string): Promise<boolean> {
  const { error } = await supabase.from('vehicle_images').delete().eq('id', id)
  return !error
}
