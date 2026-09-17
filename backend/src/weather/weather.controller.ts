import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeatherService } from './weather.service';

/**
 * Proxy vers l'API Open-Meteo (gratuite, sans clé).
 * Délègue maintenant au WeatherService injectable pour partage avec AiModule.
 */
@ApiTags('Météo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000) // 1 heure
  @ApiOperation({ summary: 'Conditions météo actuelles + prévisions (défaut: Kasserine)' })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours (1-7)' })
  async getWeather(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('days') days?: string,
  ) {
    const latitude = lat ? parseFloat(lat) : 35.1711;
    const longitude = lng ? parseFloat(lng) : 8.8306;
    const numDays = days ? parseInt(days, 10) : 1;

    if (numDays > 1) {
      const forecast = await this.weatherService.get7DayForecast(latitude, longitude);
      if (!forecast) return [];
      
      // On formate les données pour le frontend (3 premiers jours par défaut)
      const results: any[] = [];
      for (let i = 0; i < Math.min(numDays, forecast.time.length); i++) {
        results.push({
          date: forecast.time[i],
          temp: Math.round((forecast.temperature_2m_max[i] + forecast.temperature_2m_min[i]) / 2),
          temp_max: forecast.temperature_2m_max[i],
          temp_min: forecast.temperature_2m_min[i],
          description: this.getWeatherDescription(forecast.weathercode[i]),
          icon: this.getWeatherIcon(forecast.weathercode[i]),
          humidity: 60, // Open-Meteo daily forecast doesn't always have humidity without extra params
        });
      }
      return results;
    }

    return this.weatherService.getCurrentConditions(latitude, longitude);
  }

  private getWeatherDescription(code: number): string {
    if (code === 0) return 'Dégagé';
    if (code <= 3) return 'Partiellement nuageux';
    if (code <= 48) return 'Brouillard';
    if (code <= 67) return 'Pluie';
    if (code <= 77) return 'Neige';
    if (code <= 82) return 'Averses';
    if (code <= 99) return 'Orages';
    return 'Variable';
  }

  private getWeatherIcon(code: number): string {
    if (code === 0) return 'lucideSun';
    if (code <= 3) return 'lucideCloudLightning'; // Simplified mapping
    if (code <= 67) return 'lucideCloudLightning'; // Simplified mapping
    return 'lucideSun';
  }
}
