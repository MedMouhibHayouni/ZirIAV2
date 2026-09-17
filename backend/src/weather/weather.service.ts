import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

export interface WeatherForecast {
  temperature_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  precipitation_mm: number;
  weather_code: number;
  probability_of_precipitation?: number;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly httpService: HttpService) {}

  async getHistoricalWeather(lat: number, lng: number, startDate: string, endDate: string): Promise<{ tmax: number[]; tmin: number[] }> {
    this.logger.log(`Fetching historical Open-Meteo data: ${startDate} to ${endDate}`);
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      const data = response.data;
      if (!data?.daily?.temperature_2m_max) throw new Error('Invalid response');
      return { 
        tmax: data.daily.temperature_2m_max, 
        tmin: data.daily.temperature_2m_min 
      };
    } catch (error) {
      this.logger.error(`Open-Meteo Archive API failed: ${error.message}`);
      // Return single fallback value in array to prevent length errors
      return { tmax: [22], tmin: [15] };
    }
  }

  async getHistoricalTemperatures(lat: number, lng: number, startDate: string, endDate: string) {
    return this.getHistoricalWeather(lat, lng, startDate, endDate);
  }

  async get7DayForecast(lat: number, lng: number): Promise<any> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto`;
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      return response.data.daily;
    } catch (e) {
      this.logger.error(`Failed to get 7-day forecast: ${e.message}`);
      return null;
    }
  }

  async getCurrentConditions(lat: number, lng: number): Promise<WeatherForecast> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=relative_humidity_2m,precipitation_probability`;
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      const cw = response.data.current_weather;
      return {
        temperature_c: cw.temperature,
        humidity_pct: response.data.hourly?.relative_humidity_2m?.[0] || 60,
        wind_speed_kmh: cw.windspeed,
        precipitation_mm: 0,
        weather_code: cw.weathercode,
        probability_of_precipitation: response.data.hourly?.precipitation_probability?.[0] || 0
      };
    } catch (e) {
      return this.getDefaultConditions();
    }
  }

  async getDefaultConditions(): Promise<WeatherForecast> {
    return {
      temperature_c: 25,
      humidity_pct: 60,
      wind_speed_kmh: 15,
      precipitation_mm: 0,
      weather_code: 1,
      probability_of_precipitation: 0
    };
  }
}
