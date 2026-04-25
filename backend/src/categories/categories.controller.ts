import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new category',
    description: 'Creates a new category with a unique name. Categories group related topics together.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Category successfully created.',
    schema: {
      example: {
        id: 1,
        name: 'Vocabulary',
        topics: []
      }
    }
  })
  @ApiResponse({ status: 409, description: 'Category with this name already exists.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all categories',
    description: 'Retrieves all available categories with their associated topics.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Return all categories.',
    schema: {
      example: [
        {
          id: 1,
          name: 'Vocabulary',
          topics: []
        }
      ]
    }
  })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a category by id',
    description: 'Retrieves a specific category by its ID along with all associated topics.',
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'The ID of the category to retrieve' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Return a category.',
    schema: {
      example: {
        id: 1,
        name: 'Vocabulary',
        topics: []
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update a category',
    description: 'Updates a category with new information. The name must be unique.',
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'The ID of the category to update' 
  })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Category successfully updated.',
    schema: {
      example: {
        id: 1,
        name: 'Vocabulary',
        topics: []
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 409, description: 'Category with this name already exists.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete a category',
    description: 'Deletes a category. Associated topics will not be deleted.',
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'The ID of the category to delete' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category successfully deleted.',
    schema: {
      example: {
        id: 1,
        name: 'Vocabulary'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}

