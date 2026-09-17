import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SupplierVitrineService, UpdateVitrineDto } from './supplier-vitrine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('supplier/vitrine')
@UseGuards(JwtAuthGuard)
export class SupplierVitrineController {
  constructor(private readonly vitrineService: SupplierVitrineService) {}

  @Public()
  @Get('directory')
  getAllPublicVitrines(
    @Query('governorate') governorate?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.vitrineService.getAllPublicVitrines({ governorate, category, search });
  }

  @Public()
  @Get(':supplierId')
  getPublicVitrine(@Param('supplierId') supplierId: string, @Query('preview') preview?: string) {
    return this.vitrineService.getPublicVitrine(supplierId, preview === 'true');
  }

  @Post(':supplierId/review')
  submitReview(
    @Request() req,
    @Param('supplierId') supplierId: string,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
  ) {
    return this.vitrineService.submitReview(req.user.id, supplierId, rating, comment);
  }

  @Patch('profile')
  updateVitrineProfile(@Request() req, @Body() dto: UpdateVitrineDto) {
    return this.vitrineService.updateVitrineProfile(req.user.id, dto);
  }

  @Post('publish')
  publishVitrine(@Request() req) {
    return this.vitrineService.publishVitrine(req.user.id);
  }

  @Post('unpublish')
  unpublishVitrine(@Request() req) {
    return this.vitrineService.unpublishVitrine(req.user.id);
  }
}
